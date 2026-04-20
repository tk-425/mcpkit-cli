import { existsSync } from 'fs';
import { chmod, mkdir, readFile, readdir, realpath, rm, writeFile } from 'fs/promises';
import { basename, dirname, resolve } from 'path';
import { ensureMcpkitGitignoreBlock } from './gitignore.js';
import {
  getProjectRuntimeBinDirPath,
  getProjectRuntimeDirPath,
  getProjectWrapperPath,
} from './paths.js';
import {
  codexProjectConfigExists,
  readCodexProjectConfig,
} from './codex-config.js';
import {
  projectConfigExists,
  readProjectConfig,
} from './project-config.js';
import {
  openCodeProjectConfigExists,
  readOpenCodeProjectConfig,
} from './opencode-config.js';
import {
  WRAPPER_LOAD_ENV_METADATA_PREFIX,
  buildLoadEnvScript,
  buildWrapperScript,
} from './wrapper-templates.js';
import type { WrapperConfig } from './wrapper-types.js';

export interface RuntimeWriteResult {
  wroteRuntime: boolean;
  wroteLoadEnv: boolean;
  wroteWrapper: boolean;
  wrapperPath?: string;
}

function normalizeEnvNames(names: readonly string[]): string[] {
  return [...new Set(names.filter((name) => name.length > 0))].sort();
}

function parseLoadEnvNamesFromWrapperContent(content: string): string[] {
  const metadataLine = content
    .split('\n')
    .find((line) => line.startsWith(WRAPPER_LOAD_ENV_METADATA_PREFIX));

  if (!metadataLine) {
    return [];
  }

  const serializedNames = metadataLine
    .slice(WRAPPER_LOAD_ENV_METADATA_PREFIX.length)
    .trim();

  if (!serializedNames) {
    return [];
  }

  return normalizeEnvNames(serializedNames.split(/\s+/));
}

async function canonicalizePath(path: string): Promise<string> {
  const resolvedPath = resolve(path);

  try {
    return await realpath(resolvedPath);
  } catch {
    const parentDir = dirname(resolvedPath);

    try {
      const canonicalParent = await realpath(parentDir);
      return resolve(canonicalParent, basename(resolvedPath));
    } catch {
      return resolvedPath;
    }
  }
}

export async function ensureProjectRuntimeDirs(): Promise<boolean> {
  const runtimeDir = getProjectRuntimeDirPath();
  const binDir = getProjectRuntimeBinDirPath();
  const needsCreate = !existsSync(runtimeDir) || !existsSync(binDir);

  await mkdir(binDir, { recursive: true });
  return needsCreate;
}

export async function writeExecutableFile(path: string, content: string): Promise<boolean> {
  let changed = true;

  if (existsSync(path)) {
    const currentContent = await readFile(path, 'utf-8');
    changed = currentContent !== content;
  }

  if (changed) {
    await writeFile(path, content, 'utf-8');
  }

  await chmod(path, 0o755);
  return changed;
}

export async function ensureLoadEnvScript(
  envVarNames: readonly string[],
): Promise<{ wroteRuntime: boolean; wroteLoadEnv: boolean; path: string }> {
  const wroteRuntime = await ensureProjectRuntimeDirs();
  const path = getProjectWrapperPath('load-env');
  const wroteLoadEnv = await writeExecutableFile(
    path,
    buildLoadEnvScript(normalizeEnvNames(envVarNames)),
  );

  return { wroteRuntime, wroteLoadEnv, path };
}

export async function ensureServerWrapper(wrapperConfig: WrapperConfig): Promise<RuntimeWriteResult> {
  const wroteRuntime = await ensureProjectRuntimeDirs();
  let wroteLoadEnv = false;

  if (wrapperConfig.useLoadEnv !== false) {
    const loadEnvResult = await ensureLoadEnvScript(wrapperConfig.requiredEnv ?? []);
    wroteLoadEnv = loadEnvResult.wroteLoadEnv || loadEnvResult.wroteRuntime;
  }

  const wrapperPath = getProjectWrapperPath(wrapperConfig.scriptName);
  const wroteWrapper = await writeExecutableFile(wrapperPath, buildWrapperScript(wrapperConfig));

  return {
    wroteRuntime,
    wroteLoadEnv,
    wroteWrapper,
    wrapperPath,
  };
}

export async function collectReferencedWrapperPaths(): Promise<Set<string>> {
  const referencedPaths = new Set<string>();
  const runtimeBinDir = await canonicalizePath(getProjectRuntimeBinDirPath());

  if (projectConfigExists()) {
    const projectConfig = await readProjectConfig();
    for (const config of Object.values(projectConfig.mcpServers)) {
      if (typeof config.command === 'string') {
        const resolved = await canonicalizePath(config.command);
        if (resolved.startsWith(runtimeBinDir + '/') || resolved === runtimeBinDir) {
          referencedPaths.add(resolved);
        }
      }
    }
  }

  if (codexProjectConfigExists()) {
    const codexConfig = await readCodexProjectConfig();
    for (const config of Object.values(codexConfig.mcp_servers ?? {})) {
      if (typeof config.command === 'string') {
        const resolved = await canonicalizePath(config.command);
        if (resolved.startsWith(runtimeBinDir + '/') || resolved === runtimeBinDir) {
          referencedPaths.add(resolved);
        }
      }
    }
  }

  if (openCodeProjectConfigExists()) {
    const openCodeConfig = await readOpenCodeProjectConfig();
    for (const config of Object.values(openCodeConfig.mcp ?? {})) {
      if (
        config.type === 'local' &&
        Array.isArray(config.command) &&
        typeof config.command[0] === 'string'
      ) {
        const resolved = await canonicalizePath(config.command[0]);
        if (resolved.startsWith(runtimeBinDir + '/') || resolved === runtimeBinDir) {
          referencedPaths.add(resolved);
        }
      }
    }
  }

  return referencedPaths;
}

export async function collectReferencedLoadEnvNames(): Promise<string[]> {
  const referencedPaths = await collectReferencedWrapperPaths();
  const loadEnvNames = new Set<string>();

  for (const wrapperPath of referencedPaths) {
    if (basename(wrapperPath) === 'load-env' || !existsSync(wrapperPath)) {
      continue;
    }

    const content = await readFile(wrapperPath, 'utf-8');
    for (const envName of parseLoadEnvNamesFromWrapperContent(content)) {
      loadEnvNames.add(envName);
    }
  }

  return [...loadEnvNames].sort();
}

export async function syncLoadEnvWithReferencedWrappers(): Promise<boolean> {
  const referencedPaths = await collectReferencedWrapperPaths();

  if (referencedPaths.size === 0) {
    return cleanupLoadEnvIfUnused();
  }

  const loadEnvNames = await collectReferencedLoadEnvNames();
  const result = await ensureLoadEnvScript(loadEnvNames);
  return result.wroteRuntime || result.wroteLoadEnv;
}

export async function reconcileProjectRuntime(): Promise<void> {
  const runtimeBinDirPath = getProjectRuntimeBinDirPath();

  if (existsSync(runtimeBinDirPath)) {
    const runtimeBinDir = await canonicalizePath(runtimeBinDirPath);
    const referencedPaths = await collectReferencedWrapperPaths();
    const entries = await readdir(runtimeBinDirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || entry.name === 'load-env') {
        continue;
      }

      const entryPath = await canonicalizePath(resolve(runtimeBinDirPath, entry.name));

      if (!entryPath.startsWith(runtimeBinDir + '/')) {
        continue;
      }

      if (!referencedPaths.has(entryPath)) {
        await rm(entryPath);
      }
    }
  }

  await syncLoadEnvWithReferencedWrappers();
}

export async function reconcileProjectRuntimeArtifacts(): Promise<void> {
  await reconcileProjectRuntime();

  const referencedWrappers = await collectReferencedWrapperPaths();

  if (referencedWrappers.size > 0) {
    await ensureMcpkitGitignoreBlock();
  }
}

export async function cleanupUnusedWrapper(wrapperPath: string): Promise<boolean> {
  const resolvedWrapperPath = await canonicalizePath(wrapperPath);
  const runtimeBinDir = await canonicalizePath(getProjectRuntimeBinDirPath());

  if (basename(resolvedWrapperPath) === 'load-env') {
    throw new Error('cleanupUnusedWrapper cannot delete load-env directly');
  }

  if (!resolvedWrapperPath.startsWith(runtimeBinDir + '/')) {
    throw new Error(`Refusing to delete wrapper outside project runtime: ${wrapperPath}`);
  }

  if (!existsSync(resolvedWrapperPath)) {
    return false;
  }

  await rm(resolvedWrapperPath);
  return true;
}

export async function cleanupLoadEnvIfUnused(): Promise<boolean> {
  const referencedPaths = await collectReferencedWrapperPaths();
  const loadEnvPath = await canonicalizePath(getProjectWrapperPath('load-env'));

  if (referencedPaths.size > 0 || !existsSync(loadEnvPath)) {
    return false;
  }

  await rm(loadEnvPath);
  return true;
}
