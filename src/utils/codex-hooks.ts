import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { isDeepStrictEqual } from 'node:util';
import {
  getCodexHooksRegistryPath,
  getCodexProjectConfigPath,
  getRegistryDir,
} from './paths.js';
import { parseToml, stringifyToml, type TomlSerializable } from './toml.js';
import { readCodexProjectConfigOrDefault, writeCodexProjectConfig } from './codex-config.js';
import type { CodexHookHandler, CodexMatcherGroup } from './hook-validation.js';

export type { CodexHookHandler, CodexMatcherGroup };

export type CodexHooks = Record<string, CodexMatcherGroup[]>;

export interface CodexHooksRegistry {
  hooks: CodexHooks;
}

function getTrustedCodexHookPaths(): { registryPath: string; projectConfigPath: string } {
  return {
    registryPath: resolve(getCodexHooksRegistryPath()),
    projectConfigPath: resolve(getCodexProjectConfigPath()),
  };
}

function assertTrustedCodexHookPath(filePath: string): string {
  const resolvedPath = resolve(filePath);
  const { registryPath, projectConfigPath } = getTrustedCodexHookPaths();

  if (resolvedPath !== registryPath && resolvedPath !== projectConfigPath) {
    throw new Error(`Refusing to access unexpected Codex hook path: ${filePath}`);
  }

  return resolvedPath;
}

function ensureCodexHooks(registry: CodexHooksRegistry): CodexHooks {
  if (registry.hooks === undefined) {
    registry.hooks = {};
  }

  if (
    typeof registry.hooks !== 'object' ||
    registry.hooks === null ||
    Array.isArray(registry.hooks)
  ) {
    throw new Error('Invalid Codex hook registry: "hooks" must be an object');
  }

  return registry.hooks;
}

function readCodexHookTomlFile<T>(content: string, fileLabel: string): T {
  try {
    return parseToml<T>(content);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Invalid TOML in ${fileLabel}: ${error.message}\n` +
          'Please fix the syntax or delete the file to reset.',
      );
    }

    throw error;
  }
}

export async function initCodexHookRegistry(): Promise<void> {
  const registryDir = getRegistryDir();
  const registryPath = getCodexHooksRegistryPath();

  if (!existsSync(registryDir)) {
    await mkdir(registryDir, { recursive: true });
  }

  if (!existsSync(registryPath)) {
    await writeCodexHookRegistry({ hooks: {} });
  }
}

export async function readCodexHookRegistry(): Promise<CodexHooksRegistry> {
  const registryPath = getCodexHooksRegistryPath();

  if (!codexHookRegistryExists()) {
    await initCodexHookRegistry();
    return { hooks: {} };
  }

  const content = await readFile(assertTrustedCodexHookPath(registryPath), 'utf-8');
  const registry = readCodexHookTomlFile<CodexHooksRegistry>(
    content,
    `Codex hook registry file: ${registryPath}`,
  );
  ensureCodexHooks(registry);
  return registry;
}

export async function writeCodexHookRegistry(registry: CodexHooksRegistry): Promise<void> {
  const registryDir = getRegistryDir();
  const registryPath = getCodexHooksRegistryPath();
  ensureCodexHooks(registry);

  if (!existsSync(registryDir)) {
    await mkdir(registryDir, { recursive: true });
  }

  await writeFile(
    assertTrustedCodexHookPath(registryPath),
    stringifyToml(registry as unknown as TomlSerializable),
    'utf-8',
  );
}

export function codexHookRegistryExists(): boolean {
  return existsSync(getCodexHooksRegistryPath());
}

export async function addHookEntryToCodexRegistry(
  eventName: string,
  matcherGroups: CodexMatcherGroup[],
): Promise<void> {
  const registry = await readCodexHookRegistry();
  const hooks = ensureCodexHooks(registry);
  const existing = hooks[eventName] ?? [];

  for (const group of matcherGroups) {
    if (existing.some((candidate) => isDeepStrictEqual(candidate, group))) {
      throw new Error(
        `An identical matcher group for the "${eventName}" hook already exists in the Codex hook registry`,
      );
    }
    existing.push(group);
  }

  hooks[eventName] = existing;
  await writeCodexHookRegistry(registry);
}

/**
 * The entry ids (event names) present in a Codex hook registry.
 */
export function getCodexHookRegistryEntryIds(registry: CodexHooksRegistry): string[] {
  return Object.keys(ensureCodexHooks(registry));
}

export async function readCodexProjectHooks(): Promise<CodexHooks> {
  const config = await readCodexProjectConfigOrDefault();
  const hooks = config.hooks;

  if (hooks === undefined) {
    return {};
  }

  if (typeof hooks !== 'object' || hooks === null || Array.isArray(hooks)) {
    throw new Error('Invalid Codex config file: "hooks" must be an object');
  }

  return hooks as CodexHooks;
}

export async function writeCodexProjectHooks(hooks: CodexHooks): Promise<void> {
  const config = await readCodexProjectConfigOrDefault();
  config.hooks = hooks;
  await writeCodexProjectConfig(config);
}