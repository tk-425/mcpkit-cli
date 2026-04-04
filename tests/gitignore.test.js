import fs from "fs/promises";
import os from "os";
import path from "path";

import { ensureMcpkitGitignoreBlock } from "../dist/utils/gitignore.js";

describe(".gitignore helper", () => {
  let originalCwd;
  let tempDir;

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcpkit-gitignore-test-"));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("creates .gitignore with the managed block", async () => {
    await ensureMcpkitGitignoreBlock();
    const content = await fs.readFile(path.join(tempDir, ".gitignore"), "utf-8");

    expect(content).toContain("# BEGIN MCPKIT");
    expect(content).toContain(".mcpkit/");
  });

  test("does not duplicate the managed block", async () => {
    await ensureMcpkitGitignoreBlock();
    await ensureMcpkitGitignoreBlock();

    const content = await fs.readFile(path.join(tempDir, ".gitignore"), "utf-8");
    expect(content.match(/# BEGIN MCPKIT/g)).toHaveLength(1);
  });

  test("preserves existing user content", async () => {
    await fs.writeFile(path.join(tempDir, ".gitignore"), "node_modules/\n", "utf-8");
    await ensureMcpkitGitignoreBlock();

    const content = await fs.readFile(path.join(tempDir, ".gitignore"), "utf-8");
    expect(content).toContain("node_modules/");
    expect(content).toContain(".mcpkit/");
  });
});
