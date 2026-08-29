import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { isDeepStrictEqual } from 'node:util';
import {
  getClaudeHooksRegistryPath,
  getClaudeProjectSettingsPath,
  getRegistryDir,
} from './paths.js';
import { parseJsonFile } from './validation.js';

export interface ClaudeHookHandler {
  type: string;
  command?: string;
  server?: string;
  [key: string]: unknown;
}

export interface ClaudeMatcherGroup {
  matcher?: string;
  hooks: ClaudeHookHandler[];
  [key: string]: unknown;
}

export type ClaudeHooks = Record<string, ClaudeMatcherGroup[]>;

export interface ClaudeHooksRegistry {
  hooks: ClaudeHooks;
}

function getTrustedClaudeHookPaths(): { registryPath: string; projectSettingsPath: string } {
  return {
    registryPath: resolve(getClaudeHooksRegistryPath()),
    projectSettingsPath: resolve(getClaudeProjectSettingsPath()),
  };
}

function assertTrustedClaudeHookPath(filePath: string): string {
  const resolvedPath = resolve(filePath);
  const { registryPath, projectSettingsPath } = getTrustedClaudeHookPaths();

  if (resolvedPath !== registryPath && resolvedPath !== projectSettingsPath) {
    throw new Error(`Refusing to access unexpected Claude hook path: ${filePath}`);
  }

  return resolvedPath;
}

function ensureClaudeHooks(registry: ClaudeHooksRegistry): ClaudeHooks {
  if (registry.hooks === undefined) {
    registry.hooks = {};
  }

  if (
    typeof registry.hooks !== 'object' ||
    registry.hooks === null ||
    Array.isArray(registry.hooks)
  ) {
    throw new Error('Invalid Claude hook registry: "hooks" must be an object');
  }

  return registry.hooks;
}

export async function initClaudeHookRegistry(): Promise<void> {
  const registryDir = getRegistryDir();
  const registryPath = getClaudeHooksRegistryPath();

  if (!existsSync(registryDir)) {
    await mkdir(registryDir, { recursive: true });
  }

  if (!existsSync(registryPath)) {
    await writeFile(registryPath, JSON.stringify({ hooks: {} }, null, 2), 'utf-8');
  }
}

export async function readClaudeHookRegistry(): Promise<ClaudeHooksRegistry> {
  const registryPath = getClaudeHooksRegistryPath();

  if (!claudeHookRegistryExists()) {
    await initClaudeHookRegistry();
    return { hooks: {} };
  }

  const content = await readFile(assertTrustedClaudeHookPath(registryPath), 'utf-8');
  const registry = parseJsonFile<ClaudeHooksRegistry>(
    content,
    `Claude hook registry file: ${registryPath}`,
  );
  ensureClaudeHooks(registry);
  return registry;
}

export async function writeClaudeHookRegistry(registry: ClaudeHooksRegistry): Promise<void> {
  const registryDir = getRegistryDir();
  const registryPath = getClaudeHooksRegistryPath();
  ensureClaudeHooks(registry);

  if (!existsSync(registryDir)) {
    await mkdir(registryDir, { recursive: true });
  }

  await writeFile(assertTrustedClaudeHookPath(registryPath), JSON.stringify(registry, null, 2), 'utf-8');
}

export function claudeHookRegistryExists(): boolean {
  return existsSync(getClaudeHooksRegistryPath());
}

export async function addHookEntryToClaudeRegistry(
  eventName: string,
  matcherGroups: ClaudeMatcherGroup[],
): Promise<void> {
  const registry = await readClaudeHookRegistry();
  const hooks = ensureClaudeHooks(registry);
  const existing = hooks[eventName] ?? [];

  for (const group of matcherGroups) {
    if (existing.some((candidate) => isDeepStrictEqual(candidate, group))) {
      throw new Error(
        `An identical matcher group for the "${eventName}" hook already exists in the Claude hook registry`,
      );
    }
    existing.push(group);
  }

  hooks[eventName] = existing;
  await writeClaudeHookRegistry(registry);
}

/**
 * The entry ids (event names) present in a Claude hook registry.
 */
export function getClaudeHookRegistryEntryIds(registry: ClaudeHooksRegistry): string[] {
  return Object.keys(ensureClaudeHooks(registry));
}

export async function readClaudeProjectHooks(): Promise<ClaudeHooks> {
  const settingsPath = getClaudeProjectSettingsPath();

  if (!existsSync(settingsPath)) {
    return {};
  }

  const content = await readFile(assertTrustedClaudeHookPath(settingsPath), 'utf-8');
  const settings = parseJsonFile<{ hooks?: ClaudeHooks }>(
    content,
    `Claude settings file: ${settingsPath}`,
  );

  if (settings.hooks === undefined) {
    return {};
  }

  if (
    typeof settings.hooks !== 'object' ||
    settings.hooks === null ||
    Array.isArray(settings.hooks)
  ) {
    throw new Error('Invalid Claude settings file: "hooks" must be an object');
  }

  return settings.hooks;
}

export async function writeClaudeProjectHooks(hooks: ClaudeHooks): Promise<void> {
  const settingsPath = getClaudeProjectSettingsPath();

  let existing: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    const content = await readFile(assertTrustedClaudeHookPath(settingsPath), 'utf-8');
    existing = parseJsonFile<Record<string, unknown>>(
      content,
      `Claude settings file: ${settingsPath}`,
    );
  } else {
    await mkdir(dirname(settingsPath), { recursive: true });
  }

  const merged = { ...existing, hooks };
  await writeFile(assertTrustedClaudeHookPath(settingsPath), JSON.stringify(merged, null, 2), 'utf-8');
}