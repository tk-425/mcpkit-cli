import fs from "fs/promises";
import os from "os";
import path from "path";

import {
  cleanupLoadEnvIfUnused,
  cleanupUnusedWrapper,
  collectReferencedWrapperPaths,
  ensureServerWrapper,
} from "../dist/utils/project-runtime.js";
import { writeLoadEnvConfig } from "../dist/utils/load-env-config.js";

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
  let originalHome;
  let tempDir;
  let homeDir;

  beforeEach(async () => {
    originalCwd = process.cwd();
    originalHome = process.env.HOME;
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcpkit-runtime-test-"));
    homeDir = path.join(tempDir, "home");
    await fs.mkdir(homeDir, { recursive: true });
    process.env.HOME = homeDir;
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
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

  test("rewrites load-env content when global config changes", async () => {
    await ensureServerWrapper({
      scriptName: "tavily-mcp",
      requiredEnv: ["TAVILY_API_KEY"],
      exec: {
        command: "npx",
        args: ["-y", "tavily-mcp@latest"],
      },
    });

    const loadEnvPath = path.join(tempDir, ".mcpkit/bin/load-env");
    const initialContent = await fs.readFile(loadEnvPath, "utf-8");

    await writeLoadEnvConfig({
      extraEnvVars: ["ZED_API_KEY"],
    });

    await ensureServerWrapper({
      scriptName: "tavily-mcp",
      requiredEnv: ["TAVILY_API_KEY"],
      exec: {
        command: "npx",
        args: ["-y", "tavily-mcp@latest"],
      },
    });

    const updatedContent = await fs.readFile(loadEnvPath, "utf-8");

    expect(initialContent).not.toContain("ZED_API_KEY");
    expect(updatedContent).toContain("ZED_API_KEY");
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

    const referencedPaths = await collectReferencedWrapperPaths();

    expect(
      referencedPaths.has(await canonicalizePath(path.join(tempDir, ".mcpkit/bin/tavily-mcp"))),
    ).toBe(true);
    expect(
      referencedPaths.has(await canonicalizePath(path.join(tempDir, ".mcpkit/bin/context7-mcp"))),
    ).toBe(true);
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
