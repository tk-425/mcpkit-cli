import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import {
  getOpenCodeProjectConfigPath,
  getOpenCodeRegistryPath,
  getRegistryDir,
} from './paths.js';

export const OPENCODE_SCHEMA = 'https://opencode.ai/config.json';

export interface OpenCodeMcpServerConfig {
  type: 'local' | 'remote';
  command?: string[];
  url?: string;
  enabled?: boolean;
  timeout?: number;
  environment?: Record<string, string>;
  headers?: Record<string, string>;
  oauth?: Record<string, unknown> | false;
  [key: string]: unknown;
}

export interface OpenCodeConfigFile {
  [key: string]: unknown;
  $schema?: string;
  mcp?: Record<string, OpenCodeMcpServerConfig>;
}

function createEmptyOpenCodeConfig(): OpenCodeConfigFile {
  return {
    $schema: OPENCODE_SCHEMA,
    mcp: {},
  };
}

function getTrustedOpenCodePaths(): {
  projectConfigPath: string;
  registryPath: string;
} {
  return {
    projectConfigPath: resolve(getOpenCodeProjectConfigPath()),
    registryPath: resolve(getOpenCodeRegistryPath()),
  };
}

function assertTrustedOpenCodePath(filePath: string): string {
  const resolvedPath = resolve(filePath);
  const { projectConfigPath, registryPath } = getTrustedOpenCodePaths();

  if (resolvedPath !== projectConfigPath && resolvedPath !== registryPath) {
    throw new Error(`Refusing to access unexpected OpenCode config path: ${filePath}`);
  }

  return resolvedPath;
}

async function readOpenCodeFile(filePath: string, missingMessage: string): Promise<OpenCodeConfigFile> {
  const trustedPath = assertTrustedOpenCodePath(filePath);

  if (!existsSync(trustedPath)) {
    throw new Error(missingMessage);
  }

  const content = await readFile(trustedPath, 'utf-8');

  try {
    const config = JSON.parse(content) as OpenCodeConfigFile;
    ensureOpenCodeMcpServers(config);
    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Invalid JSON in OpenCode config file: ${filePath}\n` +
        'Please fix the JSON syntax or delete the file to reset.',
      );
    }

    throw error;
  }
}

async function writeOpenCodeFile(filePath: string, config: OpenCodeConfigFile): Promise<void> {
  const trustedPath = assertTrustedOpenCodePath(filePath);

  if (!config.$schema) {
    config.$schema = OPENCODE_SCHEMA;
  }

  ensureOpenCodeMcpServers(config);
  await writeFile(trustedPath, JSON.stringify(config, null, 2), 'utf-8');
}

export async function initOpenCodeRegistry(): Promise<void> {
  const registryDir = getRegistryDir();
  const registryPath = getOpenCodeRegistryPath();

  if (!existsSync(registryDir)) {
    await mkdir(registryDir, { recursive: true });
  }

  if (!existsSync(registryPath)) {
    await writeOpenCodeFile(registryPath, createEmptyOpenCodeConfig());
  }
}

export async function readOpenCodeRegistry(): Promise<OpenCodeConfigFile> {
  if (!openCodeRegistryExists()) {
    await initOpenCodeRegistry();
  }

  return readOpenCodeFile(
    getOpenCodeRegistryPath(),
    'OpenCode registry not found in ~/.mcpkit/opencode-mcp-servers.json',
  );
}

export async function writeOpenCodeRegistry(config: OpenCodeConfigFile): Promise<void> {
  const registryDir = getRegistryDir();

  if (!existsSync(registryDir)) {
    await mkdir(registryDir, { recursive: true });
  }

  await writeOpenCodeFile(getOpenCodeRegistryPath(), config);
}

export async function readOpenCodeProjectConfig(): Promise<OpenCodeConfigFile> {
  return readOpenCodeFile(
    getOpenCodeProjectConfigPath(),
    'opencode.json not found in current directory',
  );
}

export async function readOpenCodeProjectConfigOrDefault(): Promise<OpenCodeConfigFile> {
  if (!openCodeProjectConfigExists()) {
    return createEmptyOpenCodeConfig();
  }

  return readOpenCodeProjectConfig();
}

export async function writeOpenCodeProjectConfig(config: OpenCodeConfigFile): Promise<void> {
  await writeOpenCodeFile(getOpenCodeProjectConfigPath(), config);
}

export async function addServerToOpenCodeRegistry(
  name: string,
  serverConfig: OpenCodeMcpServerConfig,
): Promise<void> {
  const registry = await readOpenCodeRegistry();
  ensureOpenCodeMcpServers(registry)[name] = serverConfig;
  await writeOpenCodeRegistry(registry);
}

export async function removeServerFromOpenCodeRegistry(name: string): Promise<boolean> {
  const registry = await readOpenCodeRegistry();
  const servers = ensureOpenCodeMcpServers(registry);

  if (!servers[name]) {
    return false;
  }

  delete servers[name];
  await writeOpenCodeRegistry(registry);
  return true;
}

export async function serverExistsInOpenCodeRegistry(name: string): Promise<boolean> {
  const registry = await readOpenCodeRegistry();
  return name in ensureOpenCodeMcpServers(registry);
}

export async function addServerToOpenCodeProject(
  name: string,
  serverConfig: OpenCodeMcpServerConfig,
): Promise<void> {
  const config = await readOpenCodeProjectConfigOrDefault();
  ensureOpenCodeMcpServers(config)[name] = serverConfig;
  await writeOpenCodeProjectConfig(config);
}

export async function removeServerFromOpenCodeProject(name: string): Promise<boolean> {
  if (!openCodeProjectConfigExists()) {
    return false;
  }

  const config = await readOpenCodeProjectConfig();
  const servers = ensureOpenCodeMcpServers(config);

  if (!servers[name]) {
    return false;
  }

  delete servers[name];
  await writeOpenCodeProjectConfig(config);
  return true;
}

export async function serverExistsInOpenCodeProject(name: string): Promise<boolean> {
  if (!openCodeProjectConfigExists()) {
    return false;
  }

  const config = await readOpenCodeProjectConfig();
  return name in ensureOpenCodeMcpServers(config);
}

export function openCodeProjectConfigExists(): boolean {
  return existsSync(getOpenCodeProjectConfigPath());
}

export function openCodeRegistryExists(): boolean {
  return existsSync(getOpenCodeRegistryPath());
}

export function ensureOpenCodeMcpServers(
  config: OpenCodeConfigFile,
): Record<string, OpenCodeMcpServerConfig> {
  if (config.mcp === undefined) {
    config.mcp = {};
  }

  if (typeof config.mcp !== 'object' || config.mcp === null || Array.isArray(config.mcp)) {
    throw new Error('Invalid OpenCode config: "mcp" must be an object');
  }

  return config.mcp;
}
