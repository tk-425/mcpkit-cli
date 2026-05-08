import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import {
  getGeminiProjectConfigPath,
  getGeminiProjectDirPath,
  getGeminiRegistryPath,
  getRegistryDir,
} from './paths.js';

export interface GeminiMcpServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  httpUrl?: string;
  headers?: Record<string, string>;
  cwd?: string;
  timeout?: number;
  trust?: boolean;
  includeTools?: string[];
  excludeTools?: string[];
  [key: string]: unknown;
}

export interface GeminiConfigFile {
  [key: string]: unknown;
  mcpServers?: Record<string, GeminiMcpServerConfig>;
}

function getTrustedGeminiPaths(): { projectConfigPath: string; registryPath: string } {
  return {
    projectConfigPath: resolve(getGeminiProjectConfigPath()),
    registryPath: resolve(getGeminiRegistryPath()),
  };
}

function assertTrustedGeminiPath(filePath: string): string {
  const resolvedPath = resolve(filePath);
  const { projectConfigPath, registryPath } = getTrustedGeminiPaths();

  if (resolvedPath !== projectConfigPath && resolvedPath !== registryPath) {
    throw new Error(`Refusing to access unexpected Gemini config path: ${filePath}`);
  }

  return resolvedPath;
}

async function readGeminiFile(filePath: string, missingMessage: string): Promise<GeminiConfigFile> {
  const trustedPath = assertTrustedGeminiPath(filePath);

  if (!existsSync(trustedPath)) {
    throw new Error(missingMessage);
  }

  const content = await readFile(trustedPath, 'utf-8');

  try {
    const config = JSON.parse(content) as GeminiConfigFile;
    ensureGeminiMcpServers(config);
    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Invalid JSON in Gemini config file: ${filePath}\n` +
        'Please fix the JSON syntax or delete the file to reset.',
      );
    }

    throw error;
  }
}

async function writeGeminiFile(filePath: string, config: GeminiConfigFile): Promise<void> {
  const trustedPath = assertTrustedGeminiPath(filePath);
  ensureGeminiMcpServers(config);
  await writeFile(trustedPath, JSON.stringify(config, null, 2), 'utf-8');
}

export async function initGeminiRegistry(): Promise<void> {
  const registryDir = getRegistryDir();
  const registryPath = getGeminiRegistryPath();

  if (!existsSync(registryDir)) {
    await mkdir(registryDir, { recursive: true });
  }

  if (!existsSync(registryPath)) {
    await writeGeminiFile(registryPath, { mcpServers: {} });
  }
}

export async function readGeminiRegistry(): Promise<GeminiConfigFile> {
  if (!geminiRegistryExists()) {
    await initGeminiRegistry();
  }

  return readGeminiFile(
    getGeminiRegistryPath(),
    'Gemini registry not found in ~/.mcpkit/gemini-mcp-servers.json',
  );
}

export async function writeGeminiRegistry(config: GeminiConfigFile): Promise<void> {
  const registryDir = getRegistryDir();

  if (!existsSync(registryDir)) {
    await mkdir(registryDir, { recursive: true });
  }

  await writeGeminiFile(getGeminiRegistryPath(), config);
}

export async function readGeminiProjectConfig(): Promise<GeminiConfigFile> {
  return readGeminiFile(
    getGeminiProjectConfigPath(),
    '.gemini/settings.json not found in current directory',
  );
}

export async function readGeminiProjectConfigOrDefault(): Promise<GeminiConfigFile> {
  if (!geminiProjectConfigExists()) {
    return { mcpServers: {} };
  }

  return readGeminiProjectConfig();
}

export async function writeGeminiProjectConfig(config: GeminiConfigFile): Promise<void> {
  const trustedPath = assertTrustedGeminiPath(getGeminiProjectConfigPath());
  const geminiDir = getGeminiProjectDirPath();

  if (!existsSync(geminiDir)) {
    await mkdir(geminiDir, { recursive: true });
  }

  // Merge-on-write: preserve all non-mcpServers keys in existing settings.json
  let existing: Record<string, unknown> = {};
  if (existsSync(trustedPath)) {
    const content = await readFile(trustedPath, 'utf-8');
    try {
      existing = JSON.parse(content) as Record<string, unknown>;
    } catch {
      throw new Error(
        'Invalid JSON in .gemini/settings.json.\n' +
        'Please fix the JSON syntax or delete the file to reset.',
      );
    }
  }

  const merged = { ...existing, mcpServers: config.mcpServers ?? {} };
  await writeFile(trustedPath, JSON.stringify(merged, null, 2), 'utf-8');
}

export async function addServerToGeminiRegistry(
  name: string,
  serverConfig: GeminiMcpServerConfig,
): Promise<void> {
  const registry = await readGeminiRegistry();
  ensureGeminiMcpServers(registry)[name] = serverConfig;
  await writeGeminiRegistry(registry);
}

export async function removeServerFromGeminiRegistry(name: string): Promise<boolean> {
  const registry = await readGeminiRegistry();
  const servers = ensureGeminiMcpServers(registry);

  if (!servers[name]) {
    return false;
  }

  delete servers[name];
  await writeGeminiRegistry(registry);
  return true;
}

export async function serverExistsInGeminiRegistry(name: string): Promise<boolean> {
  const registry = await readGeminiRegistry();
  return name in ensureGeminiMcpServers(registry);
}

export async function addServerToGeminiProject(
  name: string,
  serverConfig: GeminiMcpServerConfig,
): Promise<void> {
  const config = await readGeminiProjectConfigOrDefault();
  ensureGeminiMcpServers(config)[name] = serverConfig;
  await writeGeminiProjectConfig(config);
}

export async function removeServerFromGeminiProject(name: string): Promise<boolean> {
  if (!geminiProjectConfigExists()) {
    return false;
  }

  const config = await readGeminiProjectConfig();
  const servers = ensureGeminiMcpServers(config);

  if (!servers[name]) {
    return false;
  }

  delete servers[name];
  await writeGeminiProjectConfig(config);
  return true;
}

export async function serverExistsInGeminiProject(name: string): Promise<boolean> {
  if (!geminiProjectConfigExists()) {
    return false;
  }

  const config = await readGeminiProjectConfig();
  return name in ensureGeminiMcpServers(config);
}

export function geminiProjectConfigExists(): boolean {
  return existsSync(getGeminiProjectConfigPath());
}

export function geminiRegistryExists(): boolean {
  return existsSync(getGeminiRegistryPath());
}

export function ensureGeminiMcpServers(
  config: GeminiConfigFile,
): Record<string, GeminiMcpServerConfig> {
  if (config.mcpServers === undefined) {
    config.mcpServers = {};
  }

  if (
    typeof config.mcpServers !== 'object' ||
    config.mcpServers === null ||
    Array.isArray(config.mcpServers)
  ) {
    throw new Error('Invalid Gemini config: "mcpServers" must be an object');
  }

  return config.mcpServers;
}
