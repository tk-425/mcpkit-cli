import type { ServerConfig } from './registry.js';
import type { CodexMcpServerConfig } from './codex-config.js';
import { parseToml } from './toml.js';

/**
 * Validate server name format
 * Server names should be alphanumeric with hyphens and underscores
 */
export function validateServerName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Server name cannot be empty' };
  }

  // Check for valid characters (alphanumeric, hyphens, underscores, dots)
  const validNamePattern = /^[a-zA-Z0-9-_.]+$/;
  if (!validNamePattern.test(name)) {
    return {
      valid: false,
      error: 'Server name can only contain letters, numbers, hyphens, underscores, and dots',
    };
  }

  // Check name length
  if (name.length > 100) {
    return { valid: false, error: 'Server name must be 100 characters or less' };
  }

  return { valid: true };
}

/**
 * Validate a persisted env var name used by load-env config.
 */
/**
 * Validate server configuration
 */
export function validateServerConfig(config: any): { valid: boolean; error?: string } {
  // Check if config is an object
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return { valid: false, error: 'Server configuration must be an object' };
  }

  const serverConfig = config as ServerConfig;

  // Validate required fields - either 'command' (stdio) or 'url' (streaming)
  const hasCommand = serverConfig.command !== undefined;
  const hasUrl = (serverConfig as any).url !== undefined;

  if (!hasCommand && !hasUrl) {
    return { valid: false, error: 'Server configuration must include either a "command" field (stdio) or "url" field (streaming)' };
  }

  // Validate 'command' field if present - can be string or array
  if (hasCommand) {
    if (typeof serverConfig.command === 'string') {
      // Valid: string format
    } else if (Array.isArray(serverConfig.command)) {
      // Valid: array format - check all items are strings
      if (!serverConfig.command.every((item) => typeof item === 'string')) {
        return { valid: false, error: 'All items in "command" array must be strings' };
      }
      if (serverConfig.command.length === 0) {
        return { valid: false, error: '"command" array cannot be empty' };
      }
    } else {
      return { valid: false, error: '"command" field must be a string or array of strings' };
    }
  }

  // Validate 'url' field if present
  if (hasUrl && typeof (serverConfig as any).url !== 'string') {
    return { valid: false, error: '"url" field must be a string' };
  }

  // Validate 'args' field if present
  if (serverConfig.args !== undefined) {
    if (!Array.isArray(serverConfig.args)) {
      return { valid: false, error: '"args" field must be an array' };
    }

    // Check that all args are strings
    if (!serverConfig.args.every((arg) => typeof arg === 'string')) {
      return { valid: false, error: 'All items in "args" array must be strings' };
    }
  }

  // Validate 'env' field if present
  if (serverConfig.env !== undefined) {
    if (typeof serverConfig.env !== 'object' || serverConfig.env === null || Array.isArray(serverConfig.env)) {
      return { valid: false, error: '"env" field must be an object' };
    }

    // Check that all env values are strings
    const envValues = Object.values(serverConfig.env);
    if (!envValues.every((val) => typeof val === 'string')) {
      return { valid: false, error: 'All values in "env" object must be strings' };
    }
  }

  // Validate 'type' field if present
  if (serverConfig.type !== undefined) {
    if (typeof serverConfig.type !== 'string') {
      return { valid: false, error: '"type" field must be a string' };
    }
  }

  return { valid: true };
}

function validateStringArray(value: unknown, fieldName: string): { valid: boolean; error?: string } {
  if (!Array.isArray(value)) {
    return { valid: false, error: `"${fieldName}" field must be an array` };
  }

  if (!value.every((item) => typeof item === 'string')) {
    return { valid: false, error: `All items in "${fieldName}" must be strings` };
  }

  return { valid: true };
}

function validateStringRecord(
  value: unknown,
  fieldName: string,
): { valid: boolean; error?: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { valid: false, error: `"${fieldName}" field must be an object` };
  }

  if (!Object.values(value).every((item) => typeof item === 'string')) {
    return {
      valid: false,
      error: `All values in "${fieldName}" must be strings`,
    };
  }

  return { valid: true };
}
export function validateCodexServerConfig(config: any): { valid: boolean; error?: string } {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    return { valid: false, error: 'Server configuration must be an object' };
  }

  const serverConfig = config as CodexMcpServerConfig;
  const hasCommand = serverConfig.command !== undefined;
  const hasUrl = serverConfig.url !== undefined;

  if (hasCommand === hasUrl) {
    return {
      valid: false,
      error: 'Codex server configuration must include exactly one of "command" or "url"',
    };
  }

  if (hasCommand && typeof serverConfig.command !== 'string') {
    return { valid: false, error: '"command" field must be a string' };
  }

  if (hasUrl && typeof serverConfig.url !== 'string') {
    return { valid: false, error: '"url" field must be a string' };
  }

  if (serverConfig.args !== undefined) {
    const result = validateStringArray(serverConfig.args, 'args');
    if (!result.valid) {
      return result;
    }
  }

  if (serverConfig.env !== undefined) {
    const result = validateStringRecord(serverConfig.env, 'env');
    if (!result.valid) {
      return result;
    }
  }

  if (serverConfig.env_vars !== undefined) {
    const result = validateStringArray(serverConfig.env_vars, 'env_vars');
    if (!result.valid) {
      return result;
    }
  }

  if (serverConfig.cwd !== undefined && typeof serverConfig.cwd !== 'string') {
    return { valid: false, error: '"cwd" field must be a string' };
  }

  if (
    serverConfig.bearer_token_env_var !== undefined &&
    typeof serverConfig.bearer_token_env_var !== 'string'
  ) {
    return { valid: false, error: '"bearer_token_env_var" field must be a string' };
  }

  if (serverConfig.http_headers !== undefined) {
    const result = validateStringRecord(serverConfig.http_headers, 'http_headers');
    if (!result.valid) {
      return result;
    }
  }

  if (serverConfig.env_http_headers !== undefined) {
    const result = validateStringRecord(serverConfig.env_http_headers, 'env_http_headers');
    if (!result.valid) {
      return result;
    }
  }

  if (
    serverConfig.startup_timeout_sec !== undefined &&
    (typeof serverConfig.startup_timeout_sec !== 'number' ||
      !Number.isFinite(serverConfig.startup_timeout_sec))
  ) {
    return { valid: false, error: '"startup_timeout_sec" field must be a number' };
  }

  if (
    serverConfig.tool_timeout_sec !== undefined &&
    (typeof serverConfig.tool_timeout_sec !== 'number' ||
      !Number.isFinite(serverConfig.tool_timeout_sec))
  ) {
    return { valid: false, error: '"tool_timeout_sec" field must be a number' };
  }

  if (serverConfig.enabled !== undefined && typeof serverConfig.enabled !== 'boolean') {
    return { valid: false, error: '"enabled" field must be a boolean' };
  }

  if (serverConfig.required !== undefined && typeof serverConfig.required !== 'boolean') {
    return { valid: false, error: '"required" field must be a boolean' };
  }

  if (serverConfig.enabled_tools !== undefined) {
    const result = validateStringArray(serverConfig.enabled_tools, 'enabled_tools');
    if (!result.valid) {
      return result;
    }
  }

  if (serverConfig.disabled_tools !== undefined) {
    const result = validateStringArray(serverConfig.disabled_tools, 'disabled_tools');
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

/**
 * Normalize server configuration to convert array command format to standard format
 * Converts: { command: ["npx", "-y", "pkg"] }
 * To: { command: "npx", args: ["-y", "pkg"] }
 */
export function normalizeServerConfig(config: ServerConfig): ServerConfig {
  // If command is not an array, return as-is
  if (!Array.isArray(config.command)) {
    return config;
  }

  // Convert array format to standard format
  const [command, ...commandArgs] = config.command;
  const normalizedConfig: ServerConfig = {
    ...config,
    command,
    args: [...commandArgs, ...(config.args || [])],
  };

  return normalizedConfig;
}

/**
 * Parse JSON with enhanced error messages including line/column info
 */
export function parseJSON(jsonString: string): { success: true; data: any } | { success: false; error: string } {
  try {
    const data = JSON.parse(jsonString);
    return { success: true, data };
  } catch (error) {
    if (error instanceof SyntaxError) {
      // Try to extract position information from error message
      const positionMatch = error.message.match(/position (\d+)/);
      const lineMatch = error.message.match(/line (\d+)/);

      let errorMessage = 'Invalid JSON syntax';

      if (positionMatch) {
        const position = parseInt(positionMatch[1], 10);
        const lines = jsonString.substring(0, position).split('\n');
        const line = lines.length;
        const column = lines[lines.length - 1].length + 1;
        errorMessage += ` at line ${line}, column ${column}`;
      } else if (lineMatch) {
        errorMessage += ` at line ${lineMatch[1]}`;
      }

      errorMessage += `: ${error.message}`;

      return { success: false, error: errorMessage };
    }

    return { success: false, error: 'Failed to parse JSON' };
  }
}

/**
 * Parse server input with flexible formatting and comprehensive validation
 */
export function parseServerInput(input: string): { name: string; config: ServerConfig } {
  let cleaned = input.trim();

  if (!cleaned) {
    throw new Error('Input cannot be empty');
  }

  // Remove trailing comma if present
  cleaned = cleaned.replace(/,\s*$/, '');

  // Add outer braces if missing
  if (!cleaned.startsWith('{')) {
    cleaned = `{${cleaned}}`;
  }

  // Parse JSON with enhanced error messages
  const parseResult = parseJSON(cleaned);
  if (!parseResult.success) {
    throw new Error(parseResult.error);
  }

  const parsed = parseResult.data;
  const entries = Object.entries(parsed);

  if (entries.length === 0) {
    throw new Error('No server configuration found in input');
  }

  if (entries.length > 1) {
    throw new Error('Please provide only one server configuration at a time');
  }

  const [name, config] = entries[0];

  // Validate server name
  const nameValidation = validateServerName(name as string);
  if (!nameValidation.valid) {
    throw new Error(nameValidation.error);
  }

  // Validate server config
  const configValidation = validateServerConfig(config);
  if (!configValidation.valid) {
    throw new Error(configValidation.error);
  }

  // Normalize the config (convert array command format to standard format)
  const normalizedConfig = normalizeServerConfig(config as ServerConfig);

  return { name: name as string, config: normalizedConfig };
}

export function parseCodexServerInput(
  input: string,
): { name: string; config: CodexMcpServerConfig } {
  const cleaned = input.trim();

  if (!cleaned) {
    throw new Error('Input cannot be empty');
  }

  const parsed = parseToml<{ mcp_servers?: Record<string, CodexMcpServerConfig> }>(cleaned);
  const servers = parsed.mcp_servers;

  if (!servers || typeof servers !== 'object') {
    throw new Error('TOML input must contain an [mcp_servers.<name>] table');
  }

  const entries = Object.entries(servers);

  if (entries.length === 0) {
    throw new Error('No Codex server configuration found in input');
  }

  if (entries.length > 1) {
    throw new Error('Please provide only one Codex server configuration at a time');
  }

  const [name, config] = entries[0];
  const nameValidation = validateServerName(name);

  if (!nameValidation.valid) {
    throw new Error(nameValidation.error);
  }

  const configValidation = validateCodexServerConfig(config);

  if (!configValidation.valid) {
    throw new Error(configValidation.error);
  }

  return { name, config };
}
