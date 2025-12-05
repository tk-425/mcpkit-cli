import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { getProjectConfigPath } from './paths.js';
import type { ServerConfig } from './registry.js';

export interface ProjectConfig {
  mcpServers: Record<string, ServerConfig>;
}

/**
 * Read the project config file (.mcp.json)
 */
export async function readProjectConfig(): Promise<ProjectConfig> {
  const configPath = getProjectConfigPath();

  if (!existsSync(configPath)) {
    throw new Error(`.mcp.json not found in current directory`);
  }

  try {
    const content = await readFile(configPath, 'utf-8');
    const config = JSON.parse(content) as ProjectConfig;

    // Ensure mcpServers object exists
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    return config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Invalid JSON in .mcp.json file\n` +
        `Please fix the JSON syntax in your project configuration.`
      );
    }

    // Handle file permission errors
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new Error(
        `Permission denied reading .mcp.json file\n` +
        `Please check file permissions.`
      );
    }

    throw error;
  }
}

/**
 * Write to the project config file (.mcp.json)
 */
export async function writeProjectConfig(config: ProjectConfig): Promise<void> {
  const configPath = getProjectConfigPath();

  try {
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    // Handle file permission errors
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new Error(
        `Permission denied writing to .mcp.json file\n` +
        `Please check file and directory permissions.`
      );
    }

    // Handle disk full errors
    if ((error as NodeJS.ErrnoException).code === 'ENOSPC') {
      throw new Error(
        `No space left on device when writing .mcp.json\n` +
        `Please free up disk space and try again.`
      );
    }

    throw error;
  }
}

/**
 * Add a server to the project config
 */
export async function addServerToProject(name: string, config: ServerConfig): Promise<void> {
  let projectConfig: ProjectConfig;

  try {
    projectConfig = await readProjectConfig();
  } catch (error) {
    // If file doesn't exist, create new config
    projectConfig = { mcpServers: {} };
  }

  projectConfig.mcpServers[name] = config;
  await writeProjectConfig(projectConfig);
}

/**
 * Remove a server from the project config
 */
export async function removeServerFromProject(name: string): Promise<boolean> {
  const projectConfig = await readProjectConfig();

  if (!projectConfig.mcpServers[name]) {
    return false;
  }

  delete projectConfig.mcpServers[name];
  await writeProjectConfig(projectConfig);
  return true;
}

/**
 * Check if a server exists in the project config
 */
export async function serverExistsInProject(name: string): Promise<boolean> {
  try {
    const projectConfig = await readProjectConfig();
    return name in projectConfig.mcpServers;
  } catch {
    return false;
  }
}

/**
 * Check if .mcp.json exists
 */
export function projectConfigExists(): boolean {
  return existsSync(getProjectConfigPath());
}
