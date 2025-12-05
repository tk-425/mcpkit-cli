import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  readProjectConfig,
  writeProjectConfig,
  addServerToProject,
  removeServerFromProject,
  serverExistsInProject,
  projectConfigExists,
} from '../dist/utils/project-config.js';

let testDir;
let originalCwd;

beforeEach(async () => {
  // Create a temporary directory for testing
  testDir = await mkdtemp(join(tmpdir(), 'mcpkit-project-test-'));

  // Change to test directory
  originalCwd = process.cwd();
  process.chdir(testDir);
});

afterEach(async () => {
  // Restore original directory
  process.chdir(originalCwd);

  // Clean up test directory
  if (testDir) {
    await rm(testDir, { recursive: true, force: true });
  }
});

describe('Project Config Operations', () => {
  test('projectConfigExists returns false when no config', () => {
    expect(projectConfigExists()).toBe(false);
  });

  test('projectConfigExists returns true when config exists', async () => {
    const config = { mcpServers: {} };
    await writeProjectConfig(config);
    expect(projectConfigExists()).toBe(true);
  });

  test('readProjectConfig throws error when file does not exist', async () => {
    await expect(readProjectConfig()).rejects.toThrow('.mcp.json not found');
  });

  test('writeProjectConfig creates config file', async () => {
    const config = {
      mcpServers: {
        playwright: {
          command: 'npx',
          args: ['@playwright/mcp@latest'],
        },
      },
    };

    await writeProjectConfig(config);
    const readBack = await readProjectConfig();
    expect(readBack).toEqual(config);
  });

  test('addServerToProject creates config if missing', async () => {
    const config = {
      command: 'npx',
      args: ['@playwright/mcp@latest'],
    };

    await addServerToProject('playwright', config);

    const projectConfig = await readProjectConfig();
    expect(projectConfig.mcpServers.playwright).toEqual(config);
  });

  test('addServerToProject adds to existing config', async () => {
    const config1 = { command: 'npx', args: ['playwright'] };
    const config2 = { command: 'npx', args: ['chrome'] };

    await addServerToProject('playwright', config1);
    await addServerToProject('chrome', config2);

    const projectConfig = await readProjectConfig();
    expect(projectConfig.mcpServers.playwright).toEqual(config1);
    expect(projectConfig.mcpServers.chrome).toEqual(config2);
  });

  test('addServerToProject overwrites existing server', async () => {
    const config1 = { command: 'npx', args: ['old'] };
    const config2 = { command: 'node', args: ['new'] };

    await addServerToProject('playwright', config1);
    await addServerToProject('playwright', config2);

    const projectConfig = await readProjectConfig();
    expect(projectConfig.mcpServers.playwright).toEqual(config2);
  });

  test('removeServerFromProject removes server', async () => {
    await addServerToProject('playwright', { command: 'npx' });
    await addServerToProject('chrome', { command: 'npx' });

    const removed = await removeServerFromProject('playwright');
    expect(removed).toBe(true);

    const projectConfig = await readProjectConfig();
    expect(projectConfig.mcpServers.playwright).toBeUndefined();
    expect(projectConfig.mcpServers.chrome).toBeDefined();
  });

  test('removeServerFromProject returns false for non-existent server', async () => {
    await addServerToProject('playwright', { command: 'npx' });

    const removed = await removeServerFromProject('nonexistent');
    expect(removed).toBe(false);
  });

  test('removeServerFromProject throws when config missing', async () => {
    await expect(removeServerFromProject('playwright')).rejects.toThrow('.mcp.json not found');
  });

  test('serverExistsInProject checks correctly', async () => {
    await addServerToProject('playwright', { command: 'npx' });

    expect(await serverExistsInProject('playwright')).toBe(true);
    expect(await serverExistsInProject('nonexistent')).toBe(false);
  });

  test('serverExistsInProject returns false when no config', async () => {
    expect(await serverExistsInProject('playwright')).toBe(false);
  });

  test('readProjectConfig handles malformed JSON', async () => {
    await writeFile(join(testDir, '.mcp.json'), '{invalid json}', 'utf-8');

    await expect(readProjectConfig()).rejects.toThrow('Invalid JSON');
  });

  test('readProjectConfig handles missing mcpServers object', async () => {
    await writeFile(join(testDir, '.mcp.json'), '{}', 'utf-8');

    const config = await readProjectConfig();
    expect(config.mcpServers).toEqual({});
  });
});
