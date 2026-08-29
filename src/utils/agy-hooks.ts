import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { isDeepStrictEqual } from 'node:util';
import { getAgyHooksProjectPath, getAgyHooksRegistryPath, getRegistryDir } from './paths.js';
import { parseJsonFile } from './validation.js';

export interface AgyHookHandler {
  type: 'command';
  command: string;
  timeout?: number;
  [key: string]: unknown;
}

export interface AgyMatcherGroup {
  matcher?: string;
  hooks: AgyHookHandler[];
  [key: string]: unknown;
}

export interface AgyNamedGroup {
  enabled?: boolean;
  [event: string]: unknown;
}

/**
 * Top-level named groups are the whole Antigravity hook file.
 */
export type AgyHooks = Record<string, AgyNamedGroup>;

function getTrustedAgyHookPaths(): { registryPath: string; projectPath: string } {
  return {
    registryPath: resolve(getAgyHooksRegistryPath()),
    projectPath: resolve(getAgyHooksProjectPath()),
  };
}

function assertTrustedAgyHookPath(filePath: string): string {
  const resolvedPath = resolve(filePath);
  const { registryPath, projectPath } = getTrustedAgyHookPaths();

  if (resolvedPath !== registryPath && resolvedPath !== projectPath) {
    throw new Error(`Refusing to access unexpected Antigravity hook path: ${filePath}`);
  }

  return resolvedPath;
}

export async function initAgyHookRegistry(): Promise<void> {
  const registryDir = getRegistryDir();
  const registryPath = getAgyHooksRegistryPath();

  if (!existsSync(registryDir)) {
    await mkdir(registryDir, { recursive: true });
  }

  if (!existsSync(registryPath)) {
    await writeFile(registryPath, JSON.stringify({}, null, 2), 'utf-8');
  }
}

export async function readAgyHookRegistry(): Promise<AgyHooks> {
  const registryPath = getAgyHooksRegistryPath();

  if (!agyHookRegistryExists()) {
    await initAgyHookRegistry();
    return {};
  }

  const content = await readFile(assertTrustedAgyHookPath(registryPath), 'utf-8');
  return parseJsonFile<AgyHooks>(content, `Antigravity hook registry file: ${registryPath}`);
}

export async function writeAgyHookRegistry(registry: AgyHooks): Promise<void> {
  const registryDir = getRegistryDir();
  const registryPath = getAgyHooksRegistryPath();

  if (!existsSync(registryDir)) {
    await mkdir(registryDir, { recursive: true });
  }

  await writeFile(assertTrustedAgyHookPath(registryPath), JSON.stringify(registry, null, 2), 'utf-8');
}

export function agyHookRegistryExists(): boolean {
  return existsSync(getAgyHooksRegistryPath());
}

/**
 * Add a named group to the registry, merging event arrays into an existing
 * group with the same name and rejecting exactly duplicate matcher groups.
 */
export async function addHookEntryToAgyRegistry(groupName: string, group: AgyNamedGroup): Promise<void> {
  const registry = await readAgyHookRegistry();
  const existingGroup = registry[groupName] ?? {};
  const merged: AgyNamedGroup = { ...existingGroup };

  for (const [key, value] of Object.entries(group)) {
    if (key === 'enabled') {
      merged.enabled = value as boolean;
      continue;
    }

    if (Array.isArray(value)) {
      const existingArr = Array.isArray(existingGroup[key])
        ? (existingGroup[key] as AgyMatcherGroup[])
        : [];

      for (const matcherGroup of value) {
        if (existingArr.some((candidate) => isDeepStrictEqual(candidate, matcherGroup))) {
          throw new Error(
            `An identical matcher group for the "${key}" hook already exists in the Antigravity hook registry under group "${groupName}"`,
          );
        }
        existingArr.push(matcherGroup as AgyMatcherGroup);
      }

      merged[key] = existingArr;
    } else {
      merged[key] = value;
    }
  }

  registry[groupName] = merged;
  await writeAgyHookRegistry(registry);
}

/**
 * The entry ids (group names) present in an Antigravity hook registry.
 */
export function getAgyHookRegistryEntryIds(registry: AgyHooks): string[] {
  return Object.keys(registry);
}

export async function readAgyProjectHooks(): Promise<AgyHooks> {
  const projectPath = getAgyHooksProjectPath();

  if (!existsSync(projectPath)) {
    return {};
  }

  const content = await readFile(assertTrustedAgyHookPath(projectPath), 'utf-8');
  return parseJsonFile<AgyHooks>(content, `Antigravity project hook file: ${projectPath}`);
}

export async function writeAgyProjectHooks(hooks: AgyHooks): Promise<void> {
  const projectPath = getAgyHooksProjectPath();
  const existing = await readAgyProjectHooks();
  const merged = { ...existing, ...hooks };
  const dir = dirname(projectPath);

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  await writeFile(assertTrustedAgyHookPath(projectPath), JSON.stringify(merged, null, 2), 'utf-8');
}