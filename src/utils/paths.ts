import { homedir } from 'os';
import { join } from 'path';

/**
 * Get the home directory, respecting process.env.HOME for testing
 */
function getHomeDir(): string {
  return process.env.HOME || homedir();
}

/**
 * Get the path to the registry directory (~/.mcpkit)
 */
export function getRegistryDir(): string {
  return join(getHomeDir(), '.mcpkit');
}

/**
 * Get the path to the Claude registry file (~/.mcpkit/mcp-servers.json)
 */
export function getClaudeRegistryPath(): string {
  return join(getRegistryDir(), 'mcp-servers.json');
}

/**
 * Get the path to the Codex registry file (~/.mcpkit/codex-mcp-servers.toml)
 */
export function getCodexRegistryPath(): string {
  return join(getRegistryDir(), 'codex-mcp-servers.toml');
}

/**
 * Get the path to the Claude project config file (.mcp.json in current directory)
 */
export function getClaudeProjectConfigPath(): string {
  return join(process.cwd(), '.mcp.json');
}

/**
 * Get the path to the Codex project config directory (.codex in current directory)
 */
export function getCodexProjectDirPath(): string {
  return join(process.cwd(), '.codex');
}

/**
 * Get the path to the Codex project config file (.codex/config.toml in current directory)
 */
export function getCodexProjectConfigPath(): string {
  return join(getCodexProjectDirPath(), 'config.toml');
}

/**
 * Backward-compatible alias for the Claude registry path.
 */
export function getRegistryPath(): string {
  return getClaudeRegistryPath();
}

/**
 * Backward-compatible alias for the Claude project config path.
 */
export function getProjectConfigPath(): string {
  return getClaudeProjectConfigPath();
}
