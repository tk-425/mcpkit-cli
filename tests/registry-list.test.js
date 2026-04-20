import fs from "fs/promises";
import os from "os";
import path from "path";
import { jest } from "@jest/globals";

import { registryListCommand } from "../dist/commands/registry-list.js";
import { writeOpenCodeRegistry } from "../dist/utils/opencode-config.js";
import { writeRegistry } from "../dist/utils/registry.js";

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

describe("registry list command", () => {
  let originalHome;
  let tempDir;

  beforeEach(async () => {
    originalHome = process.env.HOME;
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcpkit-registry-list-test-"));
    process.env.HOME = tempDir;
  });

  afterEach(async () => {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("no flags includes OpenCode registry section", async () => {
    await writeRegistry({
      servers: {
        playwright: {
          command: "npx",
          args: ["@playwright/mcp@latest"],
        },
      },
    });
    await writeOpenCodeRegistry({
      mcp: {
        context7: {
          type: "remote",
          url: "https://mcp.context7.com/mcp",
        },
      },
    });

    const output = await captureLogs(async () => {
      await registryListCommand({});
    });

    expect(output).toContain("Claude Code Registry (~/.mcpkit/mcp-servers.json):");
    expect(output).toContain("Codex CLI Registry (~/.mcpkit/codex-mcp-servers.toml):");
    expect(output).toContain("OpenCode CLI Registry (~/.mcpkit/opencode-mcp-servers.json):");
    expect(output).toContain("context7");
  });

  test("--opencode excludes Claude and Codex registry sections", async () => {
    await writeOpenCodeRegistry({
      mcp: {
        context7: {
          type: "remote",
          url: "https://mcp.context7.com/mcp",
        },
      },
    });

    const output = await captureLogs(async () => {
      await registryListCommand({ opencode: true });
    });

    expect(output).not.toContain("Claude Code Registry");
    expect(output).not.toContain("Codex CLI Registry");
    expect(output).toContain("OpenCode CLI Registry (~/.mcpkit/opencode-mcp-servers.json):");
  });
});
