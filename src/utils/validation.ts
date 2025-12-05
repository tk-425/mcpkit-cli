import type { ServerConfig } from './registry.js';

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

  // Validate 'command' field if present
  if (hasCommand && typeof serverConfig.command !== 'string') {
    return { valid: false, error: '"command" field must be a string' };
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

  return { name: name as string, config: config as ServerConfig };
}
