import fs from "fs/promises";
import os from "os";
import path from "path";

import { writeProjectConfig } from "../dist/utils/project-config.js";
import { writeCodexProjectConfig } from "../dist/utils/codex-config.js";
import {
  emitClaudeProjectServer,
  emitCodexProjectServer,
} from "../dist/utils/project-emitter.js";
import { ensureMcpkitGitignoreBlock } from "../dist/utils/gitignore.js";
import { cleanupLoadEnvIfUnused, cleanupUnusedWrapper } from "../dist/utils/project-runtime.js";

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

describe("wrapper integration flow", () => {
  let originalCwd;
  let tempDir;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcpkit-init-wrapper-test-"));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("writes native Claude config with wrapper command and managed gitignore block", async () => {
    const emitted = await emitClaudeProjectServer("tavily-mcp", {
      command: "npx",
      args: ["-y", "tavily-mcp@latest"],
      env: {
        TAVILY_API_KEY: "${TAVILY_API_KEY}",
      },
    });

    await writeProjectConfig({ mcpServers: { "tavily-mcp": emitted.config } });
    await ensureMcpkitGitignoreBlock();

    const projectConfig = JSON.parse(await fs.readFile(path.join(tempDir, ".mcp.json"), "utf-8"));
    const gitignore = await fs.readFile(path.join(tempDir, ".gitignore"), "utf-8");

    expect(projectConfig.mcpServers["tavily-mcp"].command).toBe(
      await canonicalizePath(path.join(tempDir, ".mcpkit/bin/tavily-mcp")),
    );
    expect(await fs.stat(path.join(tempDir, ".mcpkit/bin/tavily-mcp"))).toBeTruthy();
    expect(await fs.stat(path.join(tempDir, ".mcpkit/bin/load-env"))).toBeTruthy();
    expect(gitignore).toContain(".mcpkit/");
  });

  test("writes native Claude config with generic wrapper for interpolated stdio servers", async () => {
    const emitted = await emitClaudeProjectServer("zai-mcp-server", {
      command: "npx",
      environment: {
        Z_AI_MODE: "ZAI",
        Z_AI_API_KEY: "${GLM_MCP_API_KEY}",
      },
      args: ["-y", "@z_ai/mcp-server"],
    });

    await writeProjectConfig({ mcpServers: { "zai-mcp-server": emitted.config } });

    const projectConfig = JSON.parse(await fs.readFile(path.join(tempDir, ".mcp.json"), "utf-8"));
    expect(projectConfig.mcpServers["zai-mcp-server"].command).toBe(
      await canonicalizePath(path.join(tempDir, ".mcpkit/bin/zai-mcp-server")),
    );
  });

  test("writes native Codex config with wrapper command and preserves native fields", async () => {
    const emitted = await emitCodexProjectServer("n8n-mcp", {
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
      startup_timeout_sec: 45,
    });

    await writeCodexProjectConfig({ mcp_servers: { "n8n-mcp": emitted.config } });

    const content = await fs.readFile(path.join(tempDir, ".codex/config.toml"), "utf-8");
    expect(content).toContain(path.join(tempDir, ".mcpkit/bin/n8n-mcp"));
    expect(content).toContain("required = true");
    expect(content).toContain("startup_timeout_sec = 45");
  });

  test("cleans up unreferenced wrapper files safely", async () => {
    const emitted = await emitClaudeProjectServer("tavily-mcp", {
      command: "npx",
      args: ["-y", "tavily-mcp@latest"],
      env: {
        TAVILY_API_KEY: "${TAVILY_API_KEY}",
      },
    });

    await writeProjectConfig({ mcpServers: {} });

    expect(await cleanupUnusedWrapper(emitted.wrapperPath)).toBe(true);
    expect(await cleanupLoadEnvIfUnused()).toBe(true);
  });
});
