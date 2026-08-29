import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { isDeepStrictEqual } from 'node:util';
import {
  getCursorHooksProjectPath,
  getCursorHooksRegistryPath,
  getRegistryDir,
} from './paths.js';
import { parseJsonFile } from './validation.js';

export interface CursorHookHandler {
  command: string;
  matcher?: string;
  timeout?: number;
  [key: string]: unknown;
}

export interface CursorHookFile {
  version?: number;
  hooks?: Record<string, CursorHookHandler[]>;
  [key: string]: unknown;
}

function getTrustedCursorHookPaths(): { registryPath: string; projectPath: string } {
  return {
    registryPath: resolve(getCursorHooksRegistryPath()),
    projectPath: resolve(getCursorHooksProjectPath()),
  };
}

function assertTrustedCursorHookPath(filePath: string): string {
  const resolvedPath = resolve(filePath);
  const { registryPath, projectPath } = getTrustedCursorHookPaths();

  if (resolvedPath !== registryPath && resolvedPath !== projectPath) {
    throw new Error(`Refusing to access unexpected Cursor hook path: ${filePath}`);
  }

  return resolvedPath;
}

function ensureCursorHooks(file: CursorHookFile): Record<string, CursorHookHandler[]> {
  if (file.hooks === undefined) {
    file.hooks = {};
  }

  if (typeof file.hooks !== 'object' || file.hooks === null || Array.isArray(file.hooks)) {
    throw new Error('Invalid Cursor hook file: "hooks" must be an object');
  }

  return file.hooks;
}

export async function initCursorHookRegistry(): Promise<void> {
  const registryDir = getRegistryDir();
  const registryPath = getCursorHooksRegistryPath();

  if (!existsSync(registryDir)) {
    await mkdir(registryDir, { recursive: true });
  }

  if (!existsSync(registryPath)) {
    await writeCursorHookRegistry({ version: 1, hooks: {} });
  }
}

export async function readCursorHookRegistry(): Promise<CursorHookFile> {
  const registryPath = getCursorHooksRegistryPath();

  if (!cursorHookRegistryExists()) {
    await initCursorHookRegistry();
    return { version: 1, hooks: {} };
  }

  const content = await readFile(assertTrustedCursorHookPath(registryPath), 'utf-8');
  const file = parseJsonFile<CursorHookFile>(
    content,
    `Cursor hook registry file: ${registryPath}`,
  );
  ensureCursorHooks(file);
  return file;
}

export async function writeCursorHookRegistry(file: CursorHookFile): Promise<void> {
  const registryDir = getRegistryDir();
  const registryPath = getCursorHooksRegistryPath();
  ensureCursorHooks(file);

  if (!existsSync(registryDir)) {
    await mkdir(registryDir, { recursive: true });
  }

  await writeFile(assertTrustedCursorHookPath(registryPath), JSON.stringify(file, null, 2), 'utf-8');
}

export function cursorHookRegistryExists(): boolean {
  return existsSync(getCursorHooksRegistryPath());
}

export async function addHookEntryToCursorRegistry(
  eventName: string,
  handlers: CursorHookHandler[],
): Promise<void> {
  const file = await readCursorHookRegistry();
  const hooks = ensureCursorHooks(file);
  const existing = hooks[eventName] ?? [];

  for (const handler of handlers) {
    if (existing.some((candidate) => isDeepStrictEqual(candidate, handler))) {
      throw new Error(
        `An identical handler for the "${eventName}" hook already exists in the Cursor hook registry`,
      );
    }
    existing.push(handler);
  }

  hooks[eventName] = existing;
  await writeCursorHookRegistry(file);
}

/**
 * The entry ids (event names) present in a Cursor hook file.
 */
export function getCursorHookRegistryEntryIds(file: CursorHookFile): string[] {
  return Object.keys(ensureCursorHooks(file));
}

export async function readCursorProjectHooks(): Promise<CursorHookFile> {
  const projectPath = getCursorHooksProjectPath();

  if (!existsSync(projectPath)) {
    return { version: 1, hooks: {} };
  }

  const content = await readFile(assertTrustedCursorHookPath(projectPath), 'utf-8');
  const file = parseJsonFile<CursorHookFile>(
    content,
    `Cursor project hook file: ${projectPath}`,
  );
  ensureCursorHooks(file);
  return file;
}

/**
 * Merge hooks by event identity into the project hook file, preserving the
 * version field and any other top-level keys.
 */
export async function writeCursorProjectHooks(
  eventHooks: Record<string, CursorHookHandler[]>,
): Promise<void> {
  const projectPath = getCursorHooksProjectPath();
  const existing = await readCursorProjectHooks();
  const merged: CursorHookFile = { ...existing };
  const hooks = ensureCursorHooks(merged);
  merged.hooks = { ...hooks, ...eventHooks };
  const dir = dirname(projectPath);

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  await writeFile(assertTrustedCursorHookPath(projectPath), JSON.stringify(merged, null, 2), 'utf-8');
}