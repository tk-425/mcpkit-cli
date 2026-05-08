import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import {
  getCursorProjectConfigPath,
  getCursorProjectDirPath,
  getCursorRegistryPath,
  getRegistryDir,
} from './paths.js';

export interface CursorMcpServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  type?: 'stdio';
  envFile?: string;
  auth?: { CLIENT_ID: string; CLIENT_SECRET?: string; scopes?: string[] };
  [key: string]: unknown;
}

export interface CursorConfigFile {
  mcpServers?: Record<string, CursorMcpServerConfig>;
}

function getTrustedCursorPaths(): { projectConfigPath: string; registryPath: string } {
  return {
    projectConfigPath: resolve(getCursorProjectConfigPath()),
    registryPath: resolve(getCursorRegistryPath()),
  };
}

function assertTrustedCursorPath(filePath: string): string {
  const resolvedPath = resolve(filePath);
  const { projectConfigPath, registryPath } = getTrustedCursorPaths();

  if (resolvedPath !== projectConfigPath && resolvedPath !== registryPath) {
    throw new Error(`Refusing to access unexpected Cursor config path: ${filePath}`);
  }

  return resolvedPath;
}

async function readCursorFile(filePath: string, missingMessage: string): Promise<CursorConfigFile> {
  const trustedPath = assertTrustedCursorPath(filePath);

  if (!existsSync(trustedPath)) {
    throw new Error(missingMessage);
  }

  const content = await readFile(trustedPath, 'utf-8');

  try {
    const config = JSON.parse(content) as CursorConfigFile;
    ensureCursorMcpServers(config);
    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Invalid JSON in Cursor config file: ${filePath}\n` +
        'Please fix the JSON syntax or delete the file to reset.',
      );
    }

    throw error;
  }
}

async function writeCursorFile(filePath: string, config: CursorConfigFile): Promise<void> {
  const trustedPath = assertTrustedCursorPath(filePath);
  ensureCursorMcpServers(config);
  await writeFile(trustedPath, JSON.stringify(config, null, 2), 'utf-8');
}

export async function initCursorRegistry(): Promise<void> {
  const registryDir = getRegistryDir();
  const registryPath = getCursorRegistryPath();

  if (!existsSync(registryDir)) {
    await mkdir(registryDir, { recursive: true });
  }

  if (!existsSync(registryPath)) {
    await writeCursorFile(registryPath, { mcpServers: {} });
  }
}

export async function readCursorRegistry(): Promise<CursorConfigFile> {
  if (!cursorRegistryExists()) {
    await initCursorRegistry();
  }

  return readCursorFile(
    getCursorRegistryPath(),
    'Cursor registry not found in ~/.mcpkit/cursor-mcp-servers.json',
  );
}

export async function writeCursorRegistry(config: CursorConfigFile): Promise<void> {
  const registryDir = getRegistryDir();

  if (!existsSync(registryDir)) {
    await mkdir(registryDir, { recursive: true });
  }

  await writeCursorFile(getCursorRegistryPath(), config);
}

export async function readCursorProjectConfig(): Promise<CursorConfigFile> {
  return readCursorFile(
    getCursorProjectConfigPath(),
    '.cursor/mcp.json not found in current directory',
  );
}

export async function readCursorProjectConfigOrDefault(): Promise<CursorConfigFile> {
  if (!cursorProjectConfigExists()) {
    return { mcpServers: {} };
  }

  return readCursorProjectConfig();
}

export async function writeCursorProjectConfig(config: CursorConfigFile): Promise<void> {
  const cursorDir = getCursorProjectDirPath();

  if (!existsSync(cursorDir)) {
    await mkdir(cursorDir, { recursive: true });
  }

  await writeCursorFile(getCursorProjectConfigPath(), config);
}

export async function addServerToCursorRegistry(
  name: string,
  serverConfig: CursorMcpServerConfig,
): Promise<void> {
  const registry = await readCursorRegistry();
  ensureCursorMcpServers(registry)[name] = serverConfig;
  await writeCursorRegistry(registry);
}

export async function removeServerFromCursorRegistry(name: string): Promise<boolean> {
  const registry = await readCursorRegistry();
  const servers = ensureCursorMcpServers(registry);

  if (!servers[name]) {
    return false;
  }

  delete servers[name];
  await writeCursorRegistry(registry);
  return true;
}

export async function serverExistsInCursorRegistry(name: string): Promise<boolean> {
  const registry = await readCursorRegistry();
  return name in ensureCursorMcpServers(registry);
}

export async function addServerToCursorProject(
  name: string,
  serverConfig: CursorMcpServerConfig,
): Promise<void> {
  const config = await readCursorProjectConfigOrDefault();
  ensureCursorMcpServers(config)[name] = serverConfig;
  await writeCursorProjectConfig(config);
}

export async function removeServerFromCursorProject(name: string): Promise<boolean> {
  if (!cursorProjectConfigExists()) {
    return false;
  }

  const config = await readCursorProjectConfig();
  const servers = ensureCursorMcpServers(config);

  if (!servers[name]) {
    return false;
  }

  delete servers[name];
  await writeCursorProjectConfig(config);
  return true;
}

export async function serverExistsInCursorProject(name: string): Promise<boolean> {
  if (!cursorProjectConfigExists()) {
    return false;
  }

  const config = await readCursorProjectConfig();
  return name in ensureCursorMcpServers(config);
}

export function cursorProjectConfigExists(): boolean {
  return existsSync(getCursorProjectConfigPath());
}

export function cursorRegistryExists(): boolean {
  return existsSync(getCursorRegistryPath());
}

export function ensureCursorMcpServers(
  config: CursorConfigFile,
): Record<string, CursorMcpServerConfig> {
  if (config.mcpServers === undefined) {
    config.mcpServers = {};
  }

  if (
    typeof config.mcpServers !== 'object' ||
    config.mcpServers === null ||
    Array.isArray(config.mcpServers)
  ) {
    throw new Error('Invalid Cursor config: "mcpServers" must be an object');
  }

  return config.mcpServers;
}
