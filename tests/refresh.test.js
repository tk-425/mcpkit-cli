import fs from "fs/promises";
import os from "os";
import path from "path";
import { jest } from "@jest/globals";

import { refreshCommand } from "../dist/commands/update.js";
import {
  writeCodexProjectConfig,
  writeCodexRegistry,
} from "../dist/utils/codex-config.js";
import {
  writeOpenCodeProjectConfig,
  writeOpenCodeRegistry,
} from "../dist/utils/opencode-config.js";
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

  test("updates Claude entries in place, wraps supported remote/http servers, and preserves missing entries", async () => {
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
    const remoteServerConfig = {
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
        "web-reader": remoteServerConfig,
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
    expect(projectConfig.mcpServers["web-reader"].command).toBe(
      await canonicalizePath(path.join(projectDir, ".mcpkit/bin/web-reader")),
    );
    expect(projectConfig.mcpServers["web-reader"].url).toBeUndefined();
    expect(projectConfig.mcpServers["web-reader"].headers).toBeUndefined();
    expect(projectConfig.mcpServers["web-reader"].type).toBeUndefined();
    expect(gitignore).toContain(".mcpkit/");
    expect(output).toContain('Refreshed "tavily-mcp" with a project-local wrapper.');
    expect(output).toContain('Refreshed "web-reader" with a project-local wrapper.');
    expect(output).toContain('Preserved "missing-server": not found in the registry.');
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

  test("updates OpenCode entries automatically when opencode.json exists", async () => {
    await writeOpenCodeRegistry({
      mcp: {
        context7: {
          type: "remote",
          url: "https://mcp.context7.com/mcp",
          headers: {
            CONTEXT7_API_KEY: "${CONTEXT_7_KEY}",
          },
          enabled: true,
        },
        convex: {
          type: "local",
          command: ["npx", "-y", "convex@latest", "mcp", "start"],
        },
      },
    });

    await writeOpenCodeProjectConfig({
      model: "anthropic/claude-sonnet-4-5",
      mcp: {
        context7: {
          type: "remote",
          url: "https://old.example.com/mcp",
        },
        convex: {
          type: "local",
          command: ["npx", "-y", "convex@latest", "mcp", "start"],
        },
      },
    });

    const output = await captureLogs(async () => {
      await refreshCommand({});
    });

    const config = JSON.parse(
      await fs.readFile(path.join(projectDir, "opencode.json"), "utf-8"),
    );

    expect(config.model).toBe("anthropic/claude-sonnet-4-5");
    expect(config.mcp.context7).toEqual({
      type: "local",
      command: [
        await canonicalizePath(path.join(projectDir, ".mcpkit/bin/context7")),
      ],
      enabled: true,
    });
    expect(config.mcp.convex).toEqual({
      type: "local",
      command: ["npx", "-y", "convex@latest", "mcp", "start"],
    });
    await expect(
      fs.access(path.join(projectDir, ".mcpkit/bin/context7")),
    ).resolves.toBeUndefined();
    const loadEnvContent = await fs.readFile(
      path.join(projectDir, ".mcpkit/bin/load-env"),
      "utf-8",
    );
    expect(loadEnvContent).toContain("CONTEXT_7_KEY");
    expect(output).toContain('Refreshed "context7" with a project-local wrapper.');
    expect(output).toContain('Refreshed "convex" directly from the registry.');
  });

  test("refresh derives load-env from wrapped servers in the project", async () => {
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
        "n8n-mcp": {
          command: "npx",
          args: [
            "-y",
            "supergateway",
            "--header",
            "authorization:Bearer ${N8N_MCP_KEY}",
          ],
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
        "n8n-mcp": {
          command: "npx",
          args: [
            "-y",
            "supergateway",
            "--header",
            "authorization:Bearer ${N8N_MCP_KEY}",
          ],
        },
      },
    });

    await refreshCommand({});
    const loadEnvContent = await fs.readFile(
      path.join(projectDir, ".mcpkit/bin/load-env"),
      "utf-8",
    );

    expect(loadEnvContent).toContain("TAVILY_API_KEY");
    expect(loadEnvContent).toContain("N8N_MCP_KEY");
    expect(loadEnvContent).not.toContain("ZED_API_KEY");
  });

  test("refresh converts supported Codex remote/http headers into local wrappers", async () => {
    await writeCodexRegistry({
      mcp_servers: {
        "remote-api": {
          url: "https://example.com/mcp",
          http_headers: {
            Authorization: "Bearer ${API_KEY}",
          },
          required: true,
          startup_timeout_sec: 30,
        },
      },
    });

    await writeCodexProjectConfig({
      mcp_servers: {
        "remote-api": {
          url: "https://example.com/mcp",
          http_headers: {
            Authorization: "Bearer ${API_KEY}",
          },
          required: true,
          startup_timeout_sec: 30,
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
    const loadEnvContent = await fs.readFile(
      path.join(projectDir, ".mcpkit/bin/load-env"),
      "utf-8",
    );

    expect(content).toContain(path.join(projectDir, ".mcpkit/bin/remote-api"));
    expect(content).toContain("required = true");
    expect(content).toContain("startup_timeout_sec = 30");
    expect(content).not.toContain("https://example.com/mcp");
    expect(content).not.toContain("http_headers");
    expect(loadEnvContent).toContain("API_KEY");
    expect(output).toContain('Refreshed "remote-api" with a project-local wrapper.');
  });

  test("preserves unsupported Codex remote/http env injection entries", async () => {
    await writeCodexRegistry({
      mcp_servers: {
        "remote-api": {
          url: "https://example.com/mcp",
          env_http_headers: {
            Authorization: "API_KEY",
          },
          required: true,
        },
      },
    });

    const skippedServerConfig = {
      url: "https://example.com/mcp",
      env_http_headers: {
        Authorization: "API_KEY",
      },
      required: true,
    };

    await writeCodexProjectConfig({
      mcp_servers: {
        "remote-api": skippedServerConfig,
      },
    });

    const output = await captureLogs(async () => {
      await refreshCommand({ codex: true });
    });

    const content = await fs.readFile(
      path.join(projectDir, ".codex/config.toml"),
      "utf-8",
    );

    expect(content).toContain('url = "https://example.com/mcp"');
    expect(content).toContain('Authorization = "API_KEY"');
    expect(output).toContain("not supported for wrapper conversion");
  });
});
