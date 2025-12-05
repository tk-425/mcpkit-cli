import { describe, test, expect } from '@jest/globals';
import {
  validateServerName,
  validateServerConfig,
  parseJSON,
  parseServerInput,
} from '../dist/utils/validation.js';

describe('validateServerName', () => {
  test('accepts valid server names', () => {
    expect(validateServerName('playwright').valid).toBe(true);
    expect(validateServerName('chrome-devtools').valid).toBe(true);
    expect(validateServerName('my_server').valid).toBe(true);
    expect(validateServerName('server.123').valid).toBe(true);
    expect(validateServerName('My-Server_1.0').valid).toBe(true);
  });

  test('rejects empty server names', () => {
    const result = validateServerName('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('cannot be empty');
  });

  test('rejects server names with invalid characters', () => {
    const result = validateServerName('server name');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('can only contain');
  });

  test('rejects server names that are too long', () => {
    const longName = 'a'.repeat(101);
    const result = validateServerName(longName);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('100 characters or less');
  });
});

describe('validateServerConfig', () => {
  test('accepts valid server config', () => {
    const config = {
      command: 'npx',
      args: ['@playwright/mcp@latest'],
    };
    expect(validateServerConfig(config).valid).toBe(true);
  });

  test('accepts config with optional fields', () => {
    const config = {
      command: 'npx',
      args: ['playwright'],
      type: 'stdio',
      env: { NODE_ENV: 'production' },
    };
    expect(validateServerConfig(config).valid).toBe(true);
  });

  test('rejects non-object config', () => {
    expect(validateServerConfig('string').valid).toBe(false);
    expect(validateServerConfig(null).valid).toBe(false);
    expect(validateServerConfig([]).valid).toBe(false);
  });

  test('rejects config without command field', () => {
    const config = { args: ['test'] };
    const result = validateServerConfig(config);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('command');
  });

  test('rejects config with non-string command', () => {
    const config = { command: 123 };
    const result = validateServerConfig(config);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must be a string');
  });

  test('rejects config with non-array args', () => {
    const config = { command: 'npx', args: 'not-array' };
    const result = validateServerConfig(config);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must be an array');
  });

  test('rejects args array with non-string items', () => {
    const config = { command: 'npx', args: ['valid', 123] };
    const result = validateServerConfig(config);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must be strings');
  });

  test('rejects config with invalid env', () => {
    const config = { command: 'npx', env: 'not-object' };
    const result = validateServerConfig(config);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must be an object');
  });

  test('rejects env with non-string values', () => {
    const config = { command: 'npx', env: { KEY: 123 } };
    const result = validateServerConfig(config);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must be strings');
  });
});

describe('parseJSON', () => {
  test('parses valid JSON', () => {
    const result = parseJSON('{"key": "value"}');
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ key: 'value' });
  });

  test('handles invalid JSON with error message', () => {
    const result = parseJSON('{invalid}');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid JSON syntax');
  });

  test('parses complex JSON', () => {
    const json = JSON.stringify({
      command: 'npx',
      args: ['test'],
      env: { KEY: 'value' },
    });
    const result = parseJSON(json);
    expect(result.success).toBe(true);
  });
});

describe('parseServerInput', () => {
  test('parses valid server input with braces', () => {
    const input = '{"playwright": {"command": "npx", "args": ["@playwright/mcp@latest"]}}';
    const result = parseServerInput(input);
    expect(result.name).toBe('playwright');
    expect(result.config.command).toBe('npx');
    expect(result.config.args).toEqual(['@playwright/mcp@latest']);
  });

  test('parses server input without outer braces', () => {
    const input = '"playwright": {"command": "npx", "args": ["@playwright/mcp@latest"]}';
    const result = parseServerInput(input);
    expect(result.name).toBe('playwright');
    expect(result.config.command).toBe('npx');
  });

  test('parses input with trailing comma', () => {
    const input = '"playwright": {"command": "npx"},';
    const result = parseServerInput(input);
    expect(result.name).toBe('playwright');
    expect(result.config.command).toBe('npx');
  });

  test('throws error for empty input', () => {
    expect(() => parseServerInput('')).toThrow('cannot be empty');
  });

  test('throws error for invalid JSON', () => {
    expect(() => parseServerInput('{invalid}')).toThrow('Invalid JSON syntax');
  });

  test('throws error for multiple servers', () => {
    const input = '{"server1": {"command": "npx"}, "server2": {"command": "node"}}';
    expect(() => parseServerInput(input)).toThrow('only one server');
  });

  test('throws error for invalid server name', () => {
    const input = '{"server name": {"command": "npx"}}';
    expect(() => parseServerInput(input)).toThrow('can only contain');
  });

  test('throws error for missing command field', () => {
    const input = '{"playwright": {"args": ["test"]}}';
    expect(() => parseServerInput(input)).toThrow('command');
  });

  test('throws error for invalid config structure', () => {
    const input = '{"playwright": "not-an-object"}';
    expect(() => parseServerInput(input)).toThrow('must be an object');
  });
});
