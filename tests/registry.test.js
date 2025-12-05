import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  readRegistry,
  writeRegistry,
  addServerToRegistry,
  removeServerFromRegistry,
  serverExistsInRegistry,
  getServerNames,
} from '../dist/utils/registry.js';

// Mock the paths module to use temp directory
let testDir;
let originalHome;

beforeEach(async () => {
  // Create a temporary directory for testing
  testDir = await mkdtemp(join(tmpdir(), 'mcpkit-test-'));

  // Mock the home directory
  originalHome = process.env.HOME;
  process.env.HOME = testDir;
});

afterEach(async () => {
  // Clean up test directory first
  if (testDir) {
    await rm(testDir, { recursive: true, force: true });
  }

  // Restore original home directory
  process.env.HOME = originalHome;
});

describe('Registry Operations', () => {
  test('readRegistry creates empty registry if not exists', async () => {
    const registry = await readRegistry();
    expect(registry).toEqual({ servers: {} });
  });

  test('writeRegistry creates and writes registry file', async () => {
    const registry = {
      servers: {
        playwright: {
          command: 'npx',
          args: ['@playwright/mcp@latest'],
        },
      },
    };

    await writeRegistry(registry);
    const readBack = await readRegistry();
    expect(readBack).toEqual(registry);
  });

  test('addServerToRegistry adds server correctly', async () => {
    const config = {
      command: 'npx',
      args: ['@playwright/mcp@latest'],
    };

    await addServerToRegistry('playwright', config);

    const registry = await readRegistry();
    expect(registry.servers.playwright).toEqual(config);
  });

  test('addServerToRegistry overwrites existing server', async () => {
    const config1 = { command: 'npx', args: ['old'] };
    const config2 = { command: 'node', args: ['new'] };

    await addServerToRegistry('playwright', config1);
    await addServerToRegistry('playwright', config2);

    const registry = await readRegistry();
    expect(registry.servers.playwright).toEqual(config2);
  });

  test('removeServerFromRegistry removes server', async () => {
    await addServerToRegistry('playwright', { command: 'npx' });
    await addServerToRegistry('chrome', { command: 'npx' });

    const removed = await removeServerFromRegistry('playwright');
    expect(removed).toBe(true);

    const registry = await readRegistry();
    expect(registry.servers.playwright).toBeUndefined();
    expect(registry.servers.chrome).toBeDefined();
  });

  test('removeServerFromRegistry returns false for non-existent server', async () => {
    const removed = await removeServerFromRegistry('nonexistent');
    expect(removed).toBe(false);
  });

  test('serverExistsInRegistry checks correctly', async () => {
    await addServerToRegistry('playwright', { command: 'npx' });

    expect(await serverExistsInRegistry('playwright')).toBe(true);
    expect(await serverExistsInRegistry('nonexistent')).toBe(false);
  });

  test('getServerNames returns all server names', async () => {
    await addServerToRegistry('playwright', { command: 'npx' });
    await addServerToRegistry('chrome', { command: 'npx' });
    await addServerToRegistry('shadcn', { command: 'node' });

    const names = await getServerNames();
    expect(names).toHaveLength(3);
    expect(names).toContain('playwright');
    expect(names).toContain('chrome');
    expect(names).toContain('shadcn');
  });

  test('getServerNames returns empty array for empty registry', async () => {
    // Create a fresh temp directory for this test
    const freshDir = await mkdtemp(join(tmpdir(), 'mcpkit-test-empty-'));
    const oldHome = process.env.HOME;
    process.env.HOME = freshDir;

    try {
      const names = await getServerNames();
      expect(names).toEqual([]);
    } finally {
      process.env.HOME = oldHome;
      await rm(freshDir, { recursive: true, force: true });
    }
  });

  test('readRegistry handles malformed JSON', async () => {
    // Create a fresh temp directory for this test
    const freshDir = await mkdtemp(join(tmpdir(), 'mcpkit-test-malformed-'));
    const oldHome = process.env.HOME;
    process.env.HOME = freshDir;

    try {
      const registryPath = join(freshDir, '.mcpkit', 'mcp-servers.json');
      const registryDir = join(freshDir, '.mcpkit');

      // Create directory first
      await mkdir(registryDir, { recursive: true });

      // Write invalid JSON
      await writeFile(registryPath, '{invalid json}', 'utf-8');

      await expect(readRegistry()).rejects.toThrow('Invalid JSON');
    } finally {
      process.env.HOME = oldHome;
      await rm(freshDir, { recursive: true, force: true });
    }
  });

  test('readRegistry handles missing servers object', async () => {
    const registry = {};
    await writeRegistry(registry);

    const readBack = await readRegistry();
    expect(readBack.servers).toEqual({});
  });
});
