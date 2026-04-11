import fs from "fs/promises";
import os from "os";
import path from "path";

import {
  addConfiguredLoadEnvVar,
  listConfiguredLoadEnvVars,
  readLoadEnvConfig,
  removeConfiguredLoadEnvVar,
  writeLoadEnvConfig,
} from "../dist/utils/load-env-config.js";

describe("load-env config utilities", () => {
  let originalHome;
  let tempRoot;
  let homeDir;

  beforeEach(async () => {
    originalHome = process.env.HOME;
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mcpkit-load-env-config-test-"));
    homeDir = path.join(tempRoot, "home");
    await fs.mkdir(homeDir, { recursive: true });
    process.env.HOME = homeDir;
  });

  afterEach(async () => {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }

    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  test("bootstraps a default config when none exists", async () => {
    const config = await readLoadEnvConfig();

    expect(config).toEqual({ extraEnvVars: [] });
    expect(
      JSON.parse(
        await fs.readFile(path.join(homeDir, ".mcpkit/load-env.json"), "utf-8"),
      ),
    ).toEqual({ extraEnvVars: [] });
  });

  test("writes a deduped, sorted config", async () => {
    await writeLoadEnvConfig({
      extraEnvVars: ["ZED_API_KEY", "TAVILY_API_KEY", "ZED_API_KEY"],
    });

    expect(await listConfiguredLoadEnvVars()).toEqual([
      "TAVILY_API_KEY",
      "ZED_API_KEY",
    ]);
  });

  test("adds a new env var once and trims input", async () => {
    expect(await addConfiguredLoadEnvVar("  TAVILY_API_KEY  ")).toBe(true);
    expect(await addConfiguredLoadEnvVar("TAVILY_API_KEY")).toBe(false);
    expect(await listConfiguredLoadEnvVars()).toEqual(["TAVILY_API_KEY"]);
  });

  test("removes an existing env var and reports missing entries", async () => {
    await writeLoadEnvConfig({
      extraEnvVars: ["CONTEXT_7_KEY", "TAVILY_API_KEY"],
    });

    expect(await removeConfiguredLoadEnvVar("CONTEXT_7_KEY")).toBe(true);
    expect(await removeConfiguredLoadEnvVar("MISSING_KEY")).toBe(false);
    expect(await listConfiguredLoadEnvVars()).toEqual(["TAVILY_API_KEY"]);
  });

  test("rejects invalid env var names during persistence", async () => {
    await expect(
      writeLoadEnvConfig({
        extraEnvVars: ["invalid-key"],
      }),
    ).rejects.toThrow(
      "Environment variable name must start with a letter or underscore and contain only uppercase letters, numbers, and underscores",
    );
  });
});
