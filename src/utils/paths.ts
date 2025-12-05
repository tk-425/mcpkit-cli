import { homedir } from 'os';
import { join } from 'path';

/**
 * Get the path to the registry file (~/.mcpkit/mcp-servers.json)
 */
export function getRegistryPath(): string {
  return join(homedir(), '.mcpkit', 'mcp-servers.json');
}

/**
 * Get the path to the registry directory (~/.mcpkit)
 */
export function getRegistryDir(): string {
  return join(homedir(), '.mcpkit');
}

/**
 * Get the path to the project config file (.mcp.json in current directory)
 */
export function getProjectConfigPath(): string {
  return join(process.cwd(), '.mcp.json');
}
