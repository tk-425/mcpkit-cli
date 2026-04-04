import fs from "fs/promises";
import os from "os";
import path from "path";

import {
  cleanupLoadEnvIfUnused,
  cleanupUnusedWrapper,
  collectReferencedWrapperPaths,
  ensureServerWrapper,
} from "../dist/utils/project-runtime.js";

describe("wrapper cleanup", () => {
  let originalCwd;
  let tempDir;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcpkit-remove-test-"));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("does not delete a shared wrapper that is still referenced", async () => {
    const result = await ensureServerWrapper({
      scriptName: "tavily-mcp",
      exec: {
        command: "npx",
        args: ["-y", "tavily-mcp@latest"],
      },
    });

    await fs.writeFile(
      path.join(tempDir, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          tavily: {
            command: result.wrapperPath,
          },
        },
      }),
      "utf-8",
    );

    const referencedPaths = await collectReferencedWrapperPaths();
    expect(referencedPaths.has(result.wrapperPath)).toBe(true);
    expect(await cleanupLoadEnvIfUnused()).toBe(false);
  });

  test("deletes wrapper and load-env once unreferenced", async () => {
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
