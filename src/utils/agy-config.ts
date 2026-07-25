import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import {
  getAgyProjectConfigPath,
  getAgyProjectDirPath,
  getAgyRegistryPath,
  getRegistryDir,
} from './paths.js';

export interface AgyMcpServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  serverUrl?: string;
}

export interface AgyConfigFile {
  [key: string]: unknown;
  mcpServers?: Record<string, AgyMcpServerConfig>;
}

function getTrustedAgyPaths(): { projectConfigPath: string; registryPath: string } {
  return {
    projectConfigPath: resolve(getAgyProjectConfigPath()),
    registryPath: resolve(getAgyRegistryPath()),
  };
}

function assertTrustedAgyPath(filePath: string): string {
  const resolvedPath = resolve(filePath);
  const { projectConfigPath, registryPath } = getTrustedAgyPaths();

  if (resolvedPath !== projectConfigPath && resolvedPath !== registryPath) {
    throw new Error(`Refusing to access unexpected Antigravity config path: ${filePath}`);
  }

  return resolvedPath;
}

async function readAgyFile(filePath: string, missingMessage: string): Promise<AgyConfigFile> {
  const trustedPath = assertTrustedAgyPath(filePath);
  if (!existsSync(trustedPath)) throw new Error(missingMessage);
  try {
    const config = JSON.parse(await readFile(trustedPath, 'utf-8')) as AgyConfigFile;
    ensureAgyMcpServers(config);
    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in Antigravity config file: ${filePath}\nPlease fix the JSON syntax or delete the file to reset.`);
    }
    throw error;
  }
}

async function writeAgyFile(filePath: string, config: AgyConfigFile): Promise<void> {
  const trustedPath = assertTrustedAgyPath(filePath);
  ensureAgyMcpServers(config);
  await writeFile(trustedPath, JSON.stringify(config, null, 2), 'utf-8');
}

export async function initAgyRegistry(): Promise<void> {
  const registryDir = getRegistryDir();
  const registryPath = getAgyRegistryPath();
  if (!existsSync(registryDir)) await mkdir(registryDir, { recursive: true });
  if (!existsSync(registryPath)) await writeAgyFile(registryPath, { mcpServers: {} });
}

export async function readAgyRegistry(): Promise<AgyConfigFile> {
  if (!agyRegistryExists()) await initAgyRegistry();
  return readAgyFile(getAgyRegistryPath(), 'Antigravity registry not found in ~/.mcpkit/agy-mcp-servers.json');
}

export async function writeAgyRegistry(config: AgyConfigFile): Promise<void> {
  const registryDir = getRegistryDir();
  if (!existsSync(registryDir)) await mkdir(registryDir, { recursive: true });
  await writeAgyFile(getAgyRegistryPath(), config);
}

export async function readAgyProjectConfig(): Promise<AgyConfigFile> {
  return readAgyFile(getAgyProjectConfigPath(), '.agents/mcp_config.json not found in current directory');
}

export async function readAgyProjectConfigOrDefault(): Promise<AgyConfigFile> {
  return agyProjectConfigExists() ? readAgyProjectConfig() : { mcpServers: {} };
}

export async function writeAgyProjectConfig(config: AgyConfigFile): Promise<void> {
  const trustedPath = assertTrustedAgyPath(getAgyProjectConfigPath());
  const agyDir = getAgyProjectDirPath();
  if (!existsSync(agyDir)) await mkdir(agyDir, { recursive: true });

  let existing: Record<string, unknown> = {};
  if (existsSync(trustedPath)) {
    try {
      existing = JSON.parse(await readFile(trustedPath, 'utf-8')) as Record<string, unknown>;
    } catch {
      throw new Error('Invalid JSON in .agents/mcp_config.json.\nPlease fix the JSON syntax or delete the file to reset.');
    }
  }

  const merged = { ...existing, mcpServers: config.mcpServers ?? {} };
  await writeFile(trustedPath, JSON.stringify(merged, null, 2), 'utf-8');
}

export async function addServerToAgyRegistry(name: string, serverConfig: AgyMcpServerConfig): Promise<void> {
  const registry = await readAgyRegistry();
  ensureAgyMcpServers(registry)[name] = serverConfig;
  await writeAgyRegistry(registry);
}

export async function removeServerFromAgyRegistry(name: string): Promise<boolean> {
  const registry = await readAgyRegistry();
  const servers = ensureAgyMcpServers(registry);
  if (!servers[name]) return false;
  delete servers[name];
  await writeAgyRegistry(registry);
  return true;
}

export async function serverExistsInAgyRegistry(name: string): Promise<boolean> {
  const registry = await readAgyRegistry();
  return name in ensureAgyMcpServers(registry);
}

export async function addServerToAgyProject(name: string, serverConfig: AgyMcpServerConfig): Promise<void> {
  const config = await readAgyProjectConfigOrDefault();
  ensureAgyMcpServers(config)[name] = serverConfig;
  await writeAgyProjectConfig(config);
}

export async function removeServerFromAgyProject(name: string): Promise<boolean> {
  if (!agyProjectConfigExists()) return false;
  const config = await readAgyProjectConfig();
  const servers = ensureAgyMcpServers(config);
  if (!servers[name]) return false;
  delete servers[name];
  await writeAgyProjectConfig(config);
  return true;
}

export async function serverExistsInAgyProject(name: string): Promise<boolean> {
  if (!agyProjectConfigExists()) return false;
  const config = await readAgyProjectConfig();
  return name in ensureAgyMcpServers(config);
}

export function agyProjectConfigExists(): boolean {
  return existsSync(getAgyProjectConfigPath());
}

export function agyRegistryExists(): boolean {
  return existsSync(getAgyRegistryPath());
}

export function ensureAgyMcpServers(config: AgyConfigFile): Record<string, AgyMcpServerConfig> {
  if (config.mcpServers === undefined) config.mcpServers = {};
  if (typeof config.mcpServers !== 'object' || config.mcpServers === null || Array.isArray(config.mcpServers)) {
    throw new Error('Invalid Antigravity config: "mcpServers" must be an object');
  }
  return config.mcpServers;
}
