import { homedir } from 'os';
import { join } from 'path';

/**
 * Get the home directory, respecting process.env.HOME for testing
 */
function getHomeDir(): string {
  return process.env.HOME || homedir();
}

/**
 * Get the path to the registry file (~/.mcpkit/mcp-servers.json)
 */
export function getRegistryPath(): string {
  return join(getHomeDir(), '.mcpkit', 'mcp-servers.json');
}

/**
 * Get the path to the registry directory (~/.mcpkit)
 */
export function getRegistryDir(): string {
  return join(getHomeDir(), '.mcpkit');
}

/**
 * Get the path to the project config file (.mcp.json in current directory)
 */
export function getProjectConfigPath(): string {
  return join(process.cwd(), '.mcp.json');
}
