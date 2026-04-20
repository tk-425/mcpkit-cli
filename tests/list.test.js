import fs from "fs/promises";
import os from "os";
import path from "path";
import { jest } from "@jest/globals";

import { listCommand } from "../dist/commands/list.js";
import { writeOpenCodeProjectConfig } from "../dist/utils/opencode-config.js";
import { writeProjectConfig } from "../dist/utils/project-config.js";

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

describe("list command", () => {
  let originalCwd;
  let tempDir;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcpkit-list-test-"));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("no flags includes OpenCode project section", async () => {
    await writeProjectConfig({
      mcpServers: {
        playwright: {
          command: "npx",
          args: ["@playwright/mcp@latest"],
        },
      },
    });
    await writeOpenCodeProjectConfig({
      mcp: {
        context7: {
          type: "remote",
          url: "https://mcp.context7.com/mcp",
        },
      },
    });

    const output = await captureLogs(async () => {
      await listCommand({});
    });

    expect(output).toContain("Claude Code Project MCP Servers (.mcp.json):");
    expect(output).toContain("Codex CLI Project MCP Servers (.codex/config.toml):");
    expect(output).toContain("OpenCode CLI Project MCP Servers (opencode.json):");
    expect(output).toContain("context7");
  });

  test("--opencode excludes Claude and Codex sections", async () => {
    await writeOpenCodeProjectConfig({
      mcp: {
        context7: {
          type: "remote",
          url: "https://mcp.context7.com/mcp",
        },
      },
    });

    const output = await captureLogs(async () => {
      await listCommand({ opencode: true });
    });

    expect(output).not.toContain("Claude Code Project MCP Servers");
    expect(output).not.toContain("Codex CLI Project MCP Servers");
    expect(output).toContain("OpenCode CLI Project MCP Servers (opencode.json):");
  });
});
