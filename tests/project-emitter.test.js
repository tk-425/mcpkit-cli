import fs from "fs/promises";
import os from "os";
import path from "path";

import {
  emitClaudeProjectServer,
  emitCodexProjectServer,
} from "../dist/utils/project-emitter.js";

async function canonicalizePath(targetPath) {
  try {
    return await fs.realpath(targetPath);
  } catch {
    try {
      const parent = await fs.realpath(path.dirname(targetPath));
      return path.join(parent, path.basename(targetPath));
    } catch {
      return path.resolve(targetPath);
    }
  }
}

describe("project emitter", () => {
  let originalCwd;
  let tempDir;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcpkit-emitter-test-"));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("keeps direct Claude server entries unchanged", async () => {
    const config = {
      command: "npx",
      args: ["-y", "tavily-mcp@latest"],
    };

    const result = await emitClaudeProjectServer("tavily", config);

    expect(result.usedWrapper).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.config).toEqual(config);
  });

  test("rewrites easy-wrap Claude stdio server entries that use interpolation", async () => {
    const result = await emitClaudeProjectServer("tavily-mcp", {
      command: "npx",
      args: ["-y", "tavily-mcp@latest"],
      env: {
        TAVILY_API_KEY: "${TAVILY_API_KEY}",
        DEFAULT_PARAMETERS: '{"include_images": true}',
      },
    });

    expect(result.usedWrapper).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.config.command).toBe(
      await canonicalizePath(path.join(tempDir, ".mcpkit/bin/tavily-mcp")),
    );
    expect(result.config.args).toBeUndefined();
    expect(result.config.env).toBeUndefined();
  });

  test("rewrites generic easy-wrap Codex stdio server entries and preserves native fields", async () => {
    const result = await emitCodexProjectServer("n8n-mcp", {
      command: "npx",
      args: [
        "-y",
        "supergateway",
        "--streamableHttp",
        "https://example.com/http",
        "--header",
        "authorization:Bearer ${N8N_MCP_KEY}",
      ],
      required: true,
      startup_timeout_sec: 30,
      enabled_tools: ["search"],
    });

    expect(result.usedWrapper).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.config.command).toBe(
      await canonicalizePath(path.join(tempDir, ".mcpkit/bin/n8n-mcp")),
    );
    expect(result.config.required).toBe(true);
    expect(result.config.startup_timeout_sec).toBe(30);
    expect(result.config.enabled_tools).toEqual(["search"]);
    expect(result.config.args).toBeUndefined();
    expect(result.config.env).toBeUndefined();
  });

  test("skips unsupported remote/http interpolation instead of emitting it raw", async () => {
    const result = await emitClaudeProjectServer("web-reader", {
      type: "remote",
      url: "https://example.com/mcp",
      headers: {
        Authorization: "Bearer ${GLM_MCP_API_KEY}",
      },
    });

    expect(result.usedWrapper).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.config).toBeUndefined();
    expect(result.reason).toContain('Skipped "web-reader"');
  });
});
