import fs from "fs/promises";
import os from "os";
import path from "path";

import {
  emitClaudeProjectServer,
  emitCodexProjectServer,
  emitOpenCodeProjectServer,
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

  test("rewrites supported Claude remote/http header interpolation to a local supergateway wrapper", async () => {
    const result = await emitClaudeProjectServer("web-reader", {
      type: "remote",
      url: "https://example.com/mcp",
      headers: {
        Authorization: "Bearer ${GLM_MCP_API_KEY}",
      },
    });

    expect(result.usedWrapper).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.config.command).toBe(
      await canonicalizePath(path.join(tempDir, ".mcpkit/bin/web-reader")),
    );
    expect(result.config.url).toBeUndefined();
    expect(result.config.headers).toBeUndefined();
    expect(result.config.type).toBeUndefined();

    const wrapperContent = await fs.readFile(
      path.join(tempDir, ".mcpkit/bin/web-reader"),
      "utf-8",
    );
    expect(wrapperContent).toContain('"supergateway"');
    expect(wrapperContent).toContain('"--streamableHttp"');
    expect(wrapperContent).toContain('"https://example.com/mcp"');
    expect(wrapperContent).toContain('"Authorization: Bearer ${GLM_MCP_API_KEY}"');
  });

  test("rewrites supported Codex remote/http header interpolation to a local supergateway wrapper", async () => {
    const result = await emitCodexProjectServer("remote-api", {
      url: "https://example.com/mcp",
      http_headers: {
        Authorization: "Bearer ${API_KEY}",
      },
      required: true,
      startup_timeout_sec: 30,
    });

    expect(result.usedWrapper).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.config.command).toBe(
      await canonicalizePath(path.join(tempDir, ".mcpkit/bin/remote-api")),
    );
    expect(result.config.url).toBeUndefined();
    expect(result.config.http_headers).toBeUndefined();
    expect(result.config.required).toBe(true);
    expect(result.config.startup_timeout_sec).toBe(30);
  });

  test("skips unsupported Codex remote/http env injection shapes", async () => {
    const result = await emitCodexProjectServer("remote-api", {
      url: "https://example.com/mcp",
      env_http_headers: {
        Authorization: "API_KEY",
      },
      required: true,
    });

    expect(result.usedWrapper).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.config).toBeUndefined();
    expect(result.reason).toContain("not supported for wrapper conversion");
  });

  test("rewrites supported OpenCode remote/http header interpolation to a local supergateway wrapper", async () => {
    const result = await emitOpenCodeProjectServer("context7", {
      type: "remote",
      url: "https://mcp.context7.com/mcp",
      headers: {
        CONTEXT7_API_KEY: "${CONTEXT_7_KEY}",
      },
    });

    expect(result.usedWrapper).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.config).toEqual({
      type: "local",
      command: [
        await canonicalizePath(path.join(tempDir, ".mcpkit/bin/context7")),
      ],
    });

    const wrapperContent = await fs.readFile(
      path.join(tempDir, ".mcpkit/bin/context7"),
      "utf-8",
    );
    expect(wrapperContent).toContain('"supergateway"');
    expect(wrapperContent).toContain('"--streamableHttp"');
    expect(wrapperContent).toContain('"https://mcp.context7.com/mcp"');
    expect(wrapperContent).toContain('"CONTEXT7_API_KEY: ${CONTEXT_7_KEY}"');
  });

  test("keeps direct OpenCode local server entries unchanged", async () => {
    const config = {
      type: "local",
      command: ["npx", "-y", "convex@latest", "mcp", "start"],
    };

    const result = await emitOpenCodeProjectServer("convex", config);

    expect(result.usedWrapper).toBe(false);
    expect(result.skipped).toBe(false);
    expect(result.config).toEqual(config);
  });

  test("rewrites OpenCode local command entries with environment interpolation", async () => {
    const result = await emitOpenCodeProjectServer("example", {
      type: "local",
      command: ["npx", "-y", "example-mcp"],
      environment: {
        API_KEY: "${API_KEY}",
      },
    });

    expect(result.usedWrapper).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.config).toEqual({
      type: "local",
      command: [
        await canonicalizePath(path.join(tempDir, ".mcpkit/bin/example")),
      ],
    });

    const wrapperContent = await fs.readFile(
      path.join(tempDir, ".mcpkit/bin/example"),
      "utf-8",
    );
    expect(wrapperContent).toContain("example-mcp");
  });

  test("skips unsupported OpenCode remote/http env injection shapes", async () => {
    const result = await emitOpenCodeProjectServer("remote-api", {
      type: "remote",
      url: "https://example.com/mcp",
      oauth: {
        token: "${API_KEY}",
      },
    });

    expect(result.usedWrapper).toBe(false);
    expect(result.skipped).toBe(true);
    expect(result.config).toBeUndefined();
    expect(result.reason).toContain(
      "OpenCode CLI server uses env interpolation in a remote/http config",
    );
  });

  test("preserves OpenCode native metadata when wrapping", async () => {
    const result = await emitOpenCodeProjectServer("context7", {
      type: "remote",
      url: "https://mcp.context7.com/mcp",
      headers: {
        CONTEXT7_API_KEY: "${CONTEXT_7_KEY}",
      },
      enabled: false,
      timeout: 120,
      customField: "custom-value",
    });

    expect(result.usedWrapper).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.config.type).toBe("local");
    expect(result.config.command).toEqual([
      await canonicalizePath(path.join(tempDir, ".mcpkit/bin/context7")),
    ]);
    expect(result.config.enabled).toBe(false);
    expect(result.config.timeout).toBe(120);
    expect(result.config.customField).toBe("custom-value");
    expect(result.config.url).toBeUndefined();
    expect(result.config.headers).toBeUndefined();
  });
});
