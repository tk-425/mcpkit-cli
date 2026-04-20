import fs from "fs/promises";
import os from "os";
import path from "path";

import {
  addServerToOpenCodeProject,
  addServerToOpenCodeRegistry,
  readOpenCodeProjectConfig,
  readOpenCodeRegistry,
  removeServerFromOpenCodeRegistry,
  writeOpenCodeProjectConfig,
} from "../dist/utils/opencode-config.js";

describe("OpenCode config utilities", () => {
  let originalCwd;
  let originalHome;
  let tempRoot;
  let projectDir;
  let homeDir;

  beforeEach(async () => {
    originalCwd = process.cwd();
    originalHome = process.env.HOME;
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mcpkit-opencode-test-"));
    projectDir = path.join(tempRoot, "project");
    homeDir = path.join(tempRoot, "home");
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(homeDir, { recursive: true });
    process.chdir(projectDir);
    process.env.HOME = homeDir;
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  test("creates opencode.json when adding a project server", async () => {
    await addServerToOpenCodeProject("context7", {
      type: "remote",
      url: "https://mcp.context7.com/mcp",
    });

    const config = await readOpenCodeProjectConfig();

    expect(config.$schema).toBe("https://opencode.ai/config.json");
    expect(config.mcp.context7).toEqual({
      type: "remote",
      url: "https://mcp.context7.com/mcp",
    });
  });

  test("preserves unrelated top-level OpenCode settings", async () => {
    await writeOpenCodeProjectConfig({
      model: "anthropic/claude-sonnet-4-5",
      mcp: {
        existing: {
          type: "local",
          command: ["npx", "-y", "existing-server"],
        },
      },
    });

    await addServerToOpenCodeProject("context7", {
      type: "remote",
      url: "https://mcp.context7.com/mcp",
    });

    const config = await readOpenCodeProjectConfig();

    expect(config.$schema).toBe("https://opencode.ai/config.json");
    expect(config.model).toBe("anthropic/claude-sonnet-4-5");
    expect(config.mcp.existing).toEqual({
      type: "local",
      command: ["npx", "-y", "existing-server"],
    });
    expect(config.mcp.context7).toEqual({
      type: "remote",
      url: "https://mcp.context7.com/mcp",
    });
  });

  test("rejects existing opencode.json when mcp is not an object", async () => {
    await fs.writeFile(
      path.join(projectDir, "opencode.json"),
      JSON.stringify({
        $schema: "https://opencode.ai/config.json",
        mcp: [],
      }),
      "utf-8",
    );

    await expect(
      addServerToOpenCodeProject("context7", {
        type: "remote",
        url: "https://mcp.context7.com/mcp",
      }),
    ).rejects.toThrow('Invalid OpenCode config: "mcp" must be an object');
  });

  test("rejects existing OpenCode registry when mcp is not an object", async () => {
    await fs.mkdir(path.join(homeDir, ".mcpkit"), { recursive: true });
    await fs.writeFile(
      path.join(homeDir, ".mcpkit/opencode-mcp-servers.json"),
      JSON.stringify({
        $schema: "https://opencode.ai/config.json",
        mcp: "invalid",
      }),
      "utf-8",
    );

    await expect(
      addServerToOpenCodeRegistry("context7", {
        type: "remote",
        url: "https://mcp.context7.com/mcp",
      }),
    ).rejects.toThrow('Invalid OpenCode config: "mcp" must be an object');
  });

  test("adds and removes registry servers in ~/.mcpkit/opencode-mcp-servers.json", async () => {
    await addServerToOpenCodeRegistry("local-server", {
      type: "local",
      command: ["npx", "-y", "local-server"],
    });

    let registry = await readOpenCodeRegistry();
    expect(registry.mcp["local-server"]).toEqual({
      type: "local",
      command: ["npx", "-y", "local-server"],
    });

    const removed = await removeServerFromOpenCodeRegistry("local-server");
    registry = await readOpenCodeRegistry();

    expect(removed).toBe(true);
    expect(registry.mcp["local-server"]).toBeUndefined();
    await expect(
      fs.access(path.join(homeDir, ".mcpkit/opencode-mcp-servers.json")),
    ).resolves.toBeUndefined();
  });
});
