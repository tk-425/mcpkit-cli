import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import {
  getCodexProjectConfigPath,
  getCodexProjectDirPath,
  getCodexRegistryPath,
} from './paths.js';
import { parseToml, stringifyToml, type TomlSerializable } from './toml.js';

export interface CodexMcpServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  env_vars?: string[];
  cwd?: string;
  url?: string;
  bearer_token_env_var?: string;
  http_headers?: Record<string, string>;
  env_http_headers?: Record<string, string>;
  startup_timeout_sec?: number;
  tool_timeout_sec?: number;
  enabled?: boolean;
  required?: boolean;
  enabled_tools?: string[];
  disabled_tools?: string[];
}

export interface CodexConfigFile extends TomlSerializable {
  [key: string]: unknown;
  mcp_servers?: Record<string, CodexMcpServerConfig>;
}

function getTrustedCodexPaths(): { projectConfigPath: string; registryPath: string } {
  return {
    projectConfigPath: resolve(getCodexProjectConfigPath()),
    registryPath: resolve(getCodexRegistryPath()),
  };
}

function assertTrustedCodexPath(filePath: string): string {
  const resolvedPath = resolve(filePath);
  const { projectConfigPath, registryPath } = getTrustedCodexPaths();

  if (resolvedPath !== projectConfigPath && resolvedPath !== registryPath) {
    throw new Error(`Refusing to access unexpected Codex config path: ${filePath}`);
  }

  return resolvedPath;
}

async function readCodexRegistryFile(): Promise<CodexConfigFile> {
  const { registryPath } = getTrustedCodexPaths();
  const trustedPath = assertTrustedCodexPath(registryPath);

  if (!existsSync(trustedPath)) {
    throw new Error('Codex registry not found in ~/.mcpkit/codex-mcp-servers.toml');
  }

  const content = await readFile(trustedPath, 'utf-8');
  return parseToml<CodexConfigFile>(content);
}

async function readCodexProjectFile(): Promise<CodexConfigFile> {
  const { projectConfigPath } = getTrustedCodexPaths();
  const trustedPath = assertTrustedCodexPath(projectConfigPath);

  if (!existsSync(trustedPath)) {
    throw new Error('.codex/config.toml not found in current directory');
  }

  const content = await readFile(trustedPath, 'utf-8');
  return parseToml<CodexConfigFile>(content);
}

async function writeTomlFile(filePath: string, value: TomlSerializable): Promise<void> {
  const trustedPath = assertTrustedCodexPath(filePath);

  await writeFile(trustedPath, stringifyToml(value), 'utf-8');
}

export async function initCodexRegistry(): Promise<void> {
  const { registryPath } = getTrustedCodexPaths();

  if (!existsSync(registryPath)) {
    await writeTomlFile(registryPath, { mcp_servers: {} });
  }
}

export async function readCodexRegistry(): Promise<CodexConfigFile> {
  if (!codexRegistryExists()) {
    await initCodexRegistry();
  }

  const config = await readCodexRegistryFile();

  ensureCodexMcpServers(config);
  return config;
}

export async function readCodexProjectConfig(): Promise<CodexConfigFile> {
  const config = await readCodexProjectFile();

  ensureCodexMcpServers(config);
  return config;
}

export async function readCodexProjectConfigOrDefault(): Promise<CodexConfigFile> {
  if (!codexProjectConfigExists()) {
    return { mcp_servers: {} };
  }

  return readCodexProjectConfig();
}

export async function writeCodexRegistry(config: CodexConfigFile): Promise<void> {
  await writeTomlFile(getCodexRegistryPath(), config);
}

export async function writeCodexProjectConfig(config: CodexConfigFile): Promise<void> {
  const configDir = getCodexProjectDirPath();

  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true });
  }

  await writeTomlFile(getCodexProjectConfigPath(), config);
}

export async function addServerToCodexRegistry(
  name: string,
  serverConfig: CodexMcpServerConfig,
): Promise<void> {
  const registry = await readCodexRegistry();
  ensureCodexMcpServers(registry)[name] = serverConfig;
  await writeCodexRegistry(registry);
}

export async function removeServerFromCodexRegistry(name: string): Promise<boolean> {
  const registry = await readCodexRegistry();
  const servers = ensureCodexMcpServers(registry);

  if (!servers[name]) {
    return false;
  }

  delete servers[name];
  await writeCodexRegistry(registry);
  return true;
}

export async function serverExistsInCodexRegistry(name: string): Promise<boolean> {
  const registry = await readCodexRegistry();
  return name in ensureCodexMcpServers(registry);
}

export async function addServerToCodexProject(
  name: string,
  serverConfig: CodexMcpServerConfig,
): Promise<void> {
  const config = await readCodexProjectConfigOrDefault();
  ensureCodexMcpServers(config)[name] = serverConfig;
  await writeCodexProjectConfig(config);
}

export async function removeServerFromCodexProject(name: string): Promise<boolean> {
  if (!codexProjectConfigExists()) {
    return false;
  }

  const config = await readCodexProjectConfig();
  const servers = ensureCodexMcpServers(config);

  if (!servers[name]) {
    return false;
  }

  delete servers[name];
  await writeCodexProjectConfig(config);
  return true;
}

export async function serverExistsInCodexProject(name: string): Promise<boolean> {
  if (!codexProjectConfigExists()) {
    return false;
  }

  const config = await readCodexProjectConfig();
  return name in ensureCodexMcpServers(config);
}

export function codexProjectConfigExists(): boolean {
  return existsSync(getCodexProjectConfigPath());
}

export function codexRegistryExists(): boolean {
  return existsSync(getCodexRegistryPath());
}

export function getCodexServerNames(config: CodexConfigFile): string[] {
  return Object.keys(config.mcp_servers ?? {});
}

export function ensureCodexMcpServers(
  config: CodexConfigFile,
): Record<string, CodexMcpServerConfig> {
  if (!config.mcp_servers) {
    config.mcp_servers = {};
  }

  return config.mcp_servers;
}
