import { existsSync } from 'fs';
import { chmod, mkdir, readFile, realpath, rm, writeFile } from 'fs/promises';
import { basename, dirname, resolve } from 'path';
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
import { listConfiguredLoadEnvVars } from './load-env-config.js';
import {
  BUILT_IN_LOAD_ENV_KEYS,
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

export async function ensureLoadEnvScript(): Promise<{ wroteRuntime: boolean; wroteLoadEnv: boolean; path: string }> {
  const wroteRuntime = await ensureProjectRuntimeDirs();
  const path = getProjectWrapperPath('load-env');
  const configuredNames = await listConfiguredLoadEnvVars();
  const loadEnvNames = [...new Set([...BUILT_IN_LOAD_ENV_KEYS, ...configuredNames])].sort();
  const wroteLoadEnv = await writeExecutableFile(path, buildLoadEnvScript(loadEnvNames));

  return { wroteRuntime, wroteLoadEnv, path };
}

export async function ensureServerWrapper(wrapperConfig: WrapperConfig): Promise<RuntimeWriteResult> {
  const wroteRuntime = await ensureProjectRuntimeDirs();
  let wroteLoadEnv = false;

  if (wrapperConfig.useLoadEnv !== false) {
    const loadEnvResult = await ensureLoadEnvScript();
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

  return referencedPaths;
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
