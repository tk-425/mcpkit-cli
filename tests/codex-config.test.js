import fs from "fs/promises";
import os from "os";
import path from "path";

import {
  addServerToCodexProject,
  readCodexProjectConfig,
  writeCodexProjectConfig,
} from "../dist/utils/codex-config.js";

describe("codex project config utilities", () => {
  let originalCwd;
  let tempDir;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcpkit-codex-test-"));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("creates .codex/config.toml when adding a server", async () => {
    await addServerToCodexProject("context7", {
      command: "npx",
      args: ["-y", "@upstash/context7-mcp@latest"],
    });

    const config = await readCodexProjectConfig();
    expect(config.mcp_servers.context7).toEqual({
      command: "npx",
      args: ["-y", "@upstash/context7-mcp@latest"],
    });
  });

  test("preserves unrelated top-level Codex settings", async () => {
    await writeCodexProjectConfig({
      approval_policy: "never",
      mcp_servers: {
        existing: {
          command: "npx",
          args: ["existing-server"],
        },
      },
    });

    await addServerToCodexProject("context7", {
      command: "npx",
      args: ["-y", "@upstash/context7-mcp@latest"],
    });

    const config = await readCodexProjectConfig();
    expect(config.approval_policy).toBe("never");
    expect(config.mcp_servers.existing).toEqual({
      command: "npx",
      args: ["existing-server"],
    });
    expect(config.mcp_servers.context7).toEqual({
      command: "npx",
      args: ["-y", "@upstash/context7-mcp@latest"],
    });
  });
});
