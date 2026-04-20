import fs from "fs/promises";
import os from "os";
import path from "path";

import {
  collectReferencedLoadEnvNames,
  cleanupLoadEnvIfUnused,
  cleanupUnusedWrapper,
  collectReferencedWrapperPaths,
  ensureServerWrapper,
  syncLoadEnvWithReferencedWrappers,
} from "../dist/utils/project-runtime.js";
import { writeOpenCodeProjectConfig } from "../dist/utils/opencode-config.js";

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

describe("project runtime utilities", () => {
  let originalCwd;
  let tempDir;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcpkit-runtime-test-"));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("creates load-env and wrapper scripts as executable files", async () => {
    const result = await ensureServerWrapper({
      scriptName: "tavily-mcp",
      requiredEnv: ["TAVILY_API_KEY"],
      exec: {
        command: "npx",
        args: ["-y", "tavily-mcp@latest"],
      },
    });

    const loadEnvStat = await fs.stat(path.join(tempDir, ".mcpkit/bin/load-env"));
    const wrapperStat = await fs.stat(path.join(tempDir, ".mcpkit/bin/tavily-mcp"));
    const wrapperContent = await fs.readFile(result.wrapperPath, "utf-8");

    expect(loadEnvStat.mode & 0o111).toBeTruthy();
    expect(wrapperStat.mode & 0o111).toBeTruthy();
    expect(wrapperContent).toContain("tavily-mcp@latest");
  });

  test("writes generic easy-wrap wrappers with templated args", async () => {
    const result = await ensureServerWrapper({
      scriptName: "n8n-mcp",
      requiredEnv: ["N8N_MCP_KEY"],
      exec: {
        command: "npx",
        argTemplates: [
          "-y",
          "supergateway",
          "--header",
          "authorization:Bearer ${N8N_MCP_KEY}",
        ],
      },
    });

    const wrapperContent = await fs.readFile(result.wrapperPath, "utf-8");
    expect(wrapperContent).toContain('"authorization:Bearer ${N8N_MCP_KEY}"');
  });

  test("derives referenced load-env names from wrapper metadata", async () => {
    const first = await ensureServerWrapper({
      scriptName: "tavily-mcp",
      requiredEnv: ["TAVILY_API_KEY"],
      exec: {
        command: "npx",
        args: ["-y", "tavily-mcp@latest"],
      },
    });
    const second = await ensureServerWrapper({
      scriptName: "n8n-mcp",
      requiredEnv: ["N8N_MCP_KEY"],
      exec: {
        command: "npx",
        args: ["-y", "supergateway"],
      },
    });

    await fs.writeFile(
      path.join(tempDir, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          tavily: { command: first.wrapperPath },
          n8n: { command: second.wrapperPath },
        },
      }),
      "utf-8",
    );

    expect(await collectReferencedLoadEnvNames()).toEqual([
      "N8N_MCP_KEY",
      "TAVILY_API_KEY",
    ]);
  });

  test("syncs load-env from currently referenced wrappers", async () => {
    const first = await ensureServerWrapper({
      scriptName: "tavily-mcp",
      requiredEnv: ["TAVILY_API_KEY"],
      exec: {
        command: "npx",
        args: ["-y", "tavily-mcp@latest"],
      },
    });
    const second = await ensureServerWrapper({
      scriptName: "n8n-mcp",
      requiredEnv: ["N8N_MCP_KEY"],
      exec: {
        command: "npx",
        args: ["-y", "supergateway"],
      },
    });

    await fs.writeFile(
      path.join(tempDir, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          tavily: { command: first.wrapperPath },
        },
      }),
      "utf-8",
    );

    await syncLoadEnvWithReferencedWrappers();
    const loadEnvPath = path.join(tempDir, ".mcpkit/bin/load-env");
    const initialContent = await fs.readFile(loadEnvPath, "utf-8");

    await fs.writeFile(
      path.join(tempDir, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          tavily: { command: first.wrapperPath },
          n8n: { command: second.wrapperPath },
        },
      }),
      "utf-8",
    );

    await syncLoadEnvWithReferencedWrappers();
    const updatedContent = await fs.readFile(loadEnvPath, "utf-8");

    expect(initialContent).toContain("TAVILY_API_KEY");
    expect(initialContent).not.toContain("N8N_MCP_KEY");
    expect(updatedContent).toContain("N8N_MCP_KEY");
  });

  test("collects referenced wrapper paths from project configs", async () => {
    await fs.mkdir(path.join(tempDir, ".mcpkit/bin"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          tavily: {
            command: path.join(tempDir, ".mcpkit/bin/tavily-mcp"),
          },
        },
      }),
    );
    await fs.mkdir(path.join(tempDir, ".codex"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir, ".codex/config.toml"),
      `
[mcp_servers.context7]
command = "${path.join(tempDir, ".mcpkit/bin/context7-mcp")}"
`,
      "utf-8",
    );
    await writeOpenCodeProjectConfig({
      mcp: {
        context7: {
          type: "local",
          command: [path.join(tempDir, ".mcpkit/bin/context7")],
        },
        convex: {
          type: "local",
          command: ["npx", "-y", "convex@latest", "mcp", "start"],
        },
      },
    });

    const referencedPaths = await collectReferencedWrapperPaths();

    expect(
      referencedPaths.has(await canonicalizePath(path.join(tempDir, ".mcpkit/bin/tavily-mcp"))),
    ).toBe(true);
    expect(
      referencedPaths.has(await canonicalizePath(path.join(tempDir, ".mcpkit/bin/context7-mcp"))),
    ).toBe(true);
    expect(
      referencedPaths.has(await canonicalizePath(path.join(tempDir, ".mcpkit/bin/context7"))),
    ).toBe(true);
    expect(referencedPaths.has(await canonicalizePath("npx"))).toBe(false);
  });

  test("syncs load-env from OpenCode-only referenced wrappers", async () => {
    const result = await ensureServerWrapper({
      scriptName: "context7",
      requiredEnv: ["CONTEXT_7_KEY"],
      exec: {
        command: "npx",
        args: ["-y", "supergateway"],
      },
    });

    await writeOpenCodeProjectConfig({
      mcp: {
        context7: {
          type: "local",
          command: [result.wrapperPath],
        },
      },
    });

    await syncLoadEnvWithReferencedWrappers();

    const loadEnvContent = await fs.readFile(
      path.join(tempDir, ".mcpkit/bin/load-env"),
      "utf-8",
    );
    expect(loadEnvContent).toContain("CONTEXT_7_KEY");
  });

  test("removes unused wrapper and load-env files", async () => {
    const result = await ensureServerWrapper({
      scriptName: "context7-mcp",
      exec: {
        command: "npx",
        args: ["-y", "@upstash/context7-mcp@latest"],
      },
    });

    expect(await cleanupUnusedWrapper(result.wrapperPath)).toBe(true);
    expect(await cleanupLoadEnvIfUnused()).toBe(true);
  });
});
