import { homedir } from 'os';
import { basename, join } from 'path';

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
 * Get the path to the configurable load-env vars file (~/.mcpkit/load-env.json)
 */
export function getLoadEnvConfigPath(): string {
  return join(getRegistryDir(), 'load-env.json');
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
 * Validate a generated wrapper script name before using it in a project path.
 */
export function assertSafeWrapperName(name: string): string {
  if (!name || name.trim().length === 0) {
    throw new Error('Wrapper script name cannot be empty');
  }

  if (basename(name) !== name || name.includes('/') || name.includes('\\')) {
    throw new Error(`Unsafe wrapper script name: ${name}`);
  }

  if (!/^[A-Za-z0-9._-]+$/.test(name)) {
    throw new Error(
      'Wrapper script name can only contain letters, numbers, dots, underscores, and hyphens',
    );
  }

  return name;
}

/**
 * Get the path to the generated project runtime directory (.mcpkit in current directory)
 */
export function getProjectRuntimeDirPath(): string {
  return join(process.cwd(), '.mcpkit');
}

/**
 * Get the path to the generated project runtime bin directory (.mcpkit/bin in current directory)
 */
export function getProjectRuntimeBinDirPath(): string {
  return join(getProjectRuntimeDirPath(), 'bin');
}

/**
 * Get the path to a generated project wrapper script in .mcpkit/bin
 */
export function getProjectWrapperPath(name: string): string {
  return join(getProjectRuntimeBinDirPath(), assertSafeWrapperName(name));
}

/**
 * Get the path to the project .gitignore file in current directory
 */
export function getProjectGitignorePath(): string {
  return join(process.cwd(), '.gitignore');
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
