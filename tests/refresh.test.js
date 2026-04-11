import fs from "fs/promises";
import os from "os";
import path from "path";
import { jest } from "@jest/globals";

import { refreshCommand } from "../dist/commands/update.js";
import {
  writeCodexProjectConfig,
  writeCodexRegistry,
} from "../dist/utils/codex-config.js";
import { writeLoadEnvConfig } from "../dist/utils/load-env-config.js";
import { writeProjectConfig } from "../dist/utils/project-config.js";
import { writeRegistry } from "../dist/utils/registry.js";

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

async function captureLogs(run) {
  const messages = [];
  const logSpy = jest.spyOn(console, "log").mockImplementation((...args) => {
    messages.push(args.join(" "));
  });

  try {
    await run();
  } finally {
    logSpy.mockRestore();
  }

  return messages.join("\n");
}

describe("refresh command", () => {
  let originalCwd;
  let originalHome;
  let tempRoot;
  let projectDir;
  let homeDir;

  beforeEach(async () => {
    originalCwd = process.cwd();
    originalHome = process.env.HOME;
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mcpkit-refresh-test-"));
    projectDir = path.join(tempRoot, "project");
    homeDir = path.join(tempRoot, "home");
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(homeDir, { recursive: true });
    await fs.mkdir(path.join(homeDir, ".mcpkit"), { recursive: true });
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

  test("prints init guidance when no project config exists", async () => {
    const output = await captureLogs(async () => {
      await refreshCommand({});
    });

    expect(output).toContain('Run "mcpkit init" first.');
  });

  test("updates Claude entries in place, wraps easy stdio servers, and preserves missing or skipped entries", async () => {
    await writeRegistry({
      servers: {
        "tavily-mcp": {
          command: "npx",
          args: ["-y", "tavily-mcp@latest"],
          env: {
            TAVILY_API_KEY: "${TAVILY_API_KEY}",
          },
        },
        "web-reader": {
          type: "remote",
          url: "https://example.com/mcp",
          headers: {
            Authorization: "Bearer ${GLM_MCP_API_KEY}",
          },
        },
      },
    });

    const missingServerConfig = {
      command: "npx",
      args: ["-y", "missing-server@latest"],
    };
    const skippedServerConfig = {
      type: "remote",
      url: "https://example.com/mcp",
      headers: {
        Authorization: "Bearer ${GLM_MCP_API_KEY}",
      },
    };

    await writeProjectConfig({
      mcpServers: {
        "tavily-mcp": {
          command: "npx",
          args: ["-y", "tavily-mcp@latest"],
          env: {
            TAVILY_API_KEY: "${TAVILY_API_KEY}",
          },
        },
        "missing-server": missingServerConfig,
        "web-reader": skippedServerConfig,
      },
    });

    const output = await captureLogs(async () => {
      await refreshCommand({});
    });

    const projectConfig = JSON.parse(
      await fs.readFile(path.join(projectDir, ".mcp.json"), "utf-8"),
    );
    const gitignore = await fs.readFile(path.join(projectDir, ".gitignore"), "utf-8");

    expect(projectConfig.mcpServers["tavily-mcp"].command).toBe(
      await canonicalizePath(path.join(projectDir, ".mcpkit/bin/tavily-mcp")),
    );
    expect(projectConfig.mcpServers["missing-server"]).toEqual(missingServerConfig);
    expect(projectConfig.mcpServers["web-reader"]).toEqual(skippedServerConfig);
    expect(gitignore).toContain(".mcpkit/");
    expect(output).toContain('Refreshed "tavily-mcp" with a project-local wrapper.');
    expect(output).toContain('Preserved "missing-server": not found in the registry.');
    expect(output).toContain('Preserved "web-reader": Skipped "web-reader"');
  });

  test("updates Codex entries in place and preserves native non-launch fields", async () => {
    await writeCodexRegistry({
      mcp_servers: {
        "n8n-mcp": {
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
        },
      },
    });

    await writeCodexProjectConfig({
      mcp_servers: {
        "n8n-mcp": {
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
        },
      },
    });

    const output = await captureLogs(async () => {
      await refreshCommand({ codex: true });
    });

    const content = await fs.readFile(
      path.join(projectDir, ".codex/config.toml"),
      "utf-8",
    );

    expect(content).toContain(path.join(projectDir, ".mcpkit/bin/n8n-mcp"));
    expect(content).toContain("required = true");
    expect(content).toContain("startup_timeout_sec = 45");
    expect(output).toContain('Refreshed "n8n-mcp" with a project-local wrapper.');
  });

  test("updates both targets automatically when both project configs exist", async () => {
    await writeRegistry({
      servers: {
        "tavily-mcp": {
          command: "npx",
          args: ["-y", "tavily-mcp@latest"],
          env: {
            TAVILY_API_KEY: "${TAVILY_API_KEY}",
          },
        },
      },
    });
    await writeCodexRegistry({
      mcp_servers: {
        "zai-mcp-server": {
          command: "npx",
          environment: {
            Z_AI_MODE: "ZAI",
            Z_AI_API_KEY: "${GLM_MCP_API_KEY}",
          },
          args: ["-y", "@z_ai/mcp-server"],
        },
      },
    });

    await writeProjectConfig({
      mcpServers: {
        "tavily-mcp": {
          command: "npx",
          args: ["-y", "tavily-mcp@latest"],
          env: {
            TAVILY_API_KEY: "${TAVILY_API_KEY}",
          },
        },
      },
    });
    await writeCodexProjectConfig({
      mcp_servers: {
        "zai-mcp-server": {
          command: "npx",
          environment: {
            Z_AI_MODE: "ZAI",
            Z_AI_API_KEY: "${GLM_MCP_API_KEY}",
          },
          args: ["-y", "@z_ai/mcp-server"],
        },
      },
    });

    await refreshCommand({});

    const claudeConfig = JSON.parse(
      await fs.readFile(path.join(projectDir, ".mcp.json"), "utf-8"),
    );
    const codexContent = await fs.readFile(
      path.join(projectDir, ".codex/config.toml"),
      "utf-8",
    );

    expect(claudeConfig.mcpServers["tavily-mcp"].command).toBe(
      await canonicalizePath(path.join(projectDir, ".mcpkit/bin/tavily-mcp")),
    );
    expect(codexContent).toContain(path.join(projectDir, ".mcpkit/bin/zai-mcp-server"));
  });

  test("refresh regenerates load-env with configured global env vars", async () => {
    await writeRegistry({
      servers: {
        "tavily-mcp": {
          command: "npx",
          args: ["-y", "tavily-mcp@latest"],
          env: {
            TAVILY_API_KEY: "${TAVILY_API_KEY}",
          },
        },
      },
    });

    await writeProjectConfig({
      mcpServers: {
        "tavily-mcp": {
          command: "npx",
          args: ["-y", "tavily-mcp@latest"],
          env: {
            TAVILY_API_KEY: "${TAVILY_API_KEY}",
          },
        },
      },
    });

    await refreshCommand({});
    const loadEnvPath = path.join(projectDir, ".mcpkit/bin/load-env");
    const initialContent = await fs.readFile(loadEnvPath, "utf-8");

    await writeLoadEnvConfig({
      extraEnvVars: ["ZED_API_KEY"],
    });

    await refreshCommand({});
    const refreshedContent = await fs.readFile(loadEnvPath, "utf-8");

    expect(initialContent).not.toContain("ZED_API_KEY");
    expect(refreshedContent).toContain("ZED_API_KEY");
  });
});
