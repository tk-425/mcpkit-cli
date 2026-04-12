import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { getRegistryPath, getRegistryDir } from './paths.js';

export interface ServerConfig {
  command?: string | string[];  // For stdio servers - supports both string and array formats
  url?: string;      // For streaming servers
  args?: string[];
  type?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;
  [key: string]: any;
}

export interface Registry {
  servers: Record<string, ServerConfig>;
}

/**
 * Initialize the registry file if it doesn't exist
 */
export async function initRegistry(): Promise<void> {
  const registryDir = getRegistryDir();
  const registryPath = getRegistryPath();

  // Create directory if it doesn't exist
  if (!existsSync(registryDir)) {
    await mkdir(registryDir, { recursive: true });
  }

  // Create empty registry file if it doesn't exist
  if (!existsSync(registryPath)) {
    const emptyRegistry: Registry = { servers: {} };
    await writeFile(registryPath, JSON.stringify(emptyRegistry, null, 2), 'utf-8');
  }
}

/**
 * Read the registry file
 */
export async function readRegistry(): Promise<Registry> {
  const registryPath = getRegistryPath();

  // Initialize if doesn't exist
  if (!existsSync(registryPath)) {
    await initRegistry();
    return { servers: {} };
  }

  try {
    const content = await readFile(registryPath, 'utf-8');
    const registry = JSON.parse(content) as Registry;

    // Ensure servers object exists
    if (!registry.servers) {
      registry.servers = {};
    }

    return registry;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Invalid JSON in registry file: ${registryPath}\n` +
        `Please fix the JSON syntax or delete the file to reset.`
      );
    }

    // Handle file permission errors
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new Error(
        `Permission denied reading registry file: ${registryPath}\n` +
        `Please check file permissions.`
      );
    }

    throw error;
  }
}

/**
 * Write to the registry file
 */
export async function writeRegistry(registry: Registry): Promise<void> {
  const registryPath = getRegistryPath();
  const registryDir = getRegistryDir();

  try {
    // Ensure directory exists
    if (!existsSync(registryDir)) {
      await mkdir(registryDir, { recursive: true });
    }

    await writeFile(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
  } catch (error) {
    // Handle file permission errors
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new Error(
        `Permission denied writing to registry file: ${registryPath}\n` +
        `Please check file and directory permissions.`
      );
    }

    // Handle disk full errors
    if ((error as NodeJS.ErrnoException).code === 'ENOSPC') {
      throw new Error(
        `No space left on device when writing to: ${registryPath}\n` +
        `Please free up disk space and try again.`
      );
    }

    throw error;
  }
}

/**
 * Add a server to the registry
 */
export async function addServerToRegistry(name: string, config: ServerConfig): Promise<void> {
  const registry = await readRegistry();
  registry.servers[name] = config;
  await writeRegistry(registry);
}

/**
 * Remove a server from the registry
 */
export async function removeServerFromRegistry(name: string): Promise<boolean> {
  const registry = await readRegistry();

  if (!registry.servers[name]) {
    return false;
  }

  delete registry.servers[name];
  await writeRegistry(registry);
  return true;
}

/**
 * Check if a server exists in the registry
 */
export async function serverExistsInRegistry(name: string): Promise<boolean> {
  const registry = await readRegistry();
  return name in registry.servers;
}

/**
 * Get all server names from the registry
 */
export async function getServerNames(): Promise<string[]> {
  const registry = await readRegistry();
  return Object.keys(registry.servers);
}
