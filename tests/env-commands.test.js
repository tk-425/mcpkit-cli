import fs from "fs/promises";
import os from "os";
import path from "path";
import { jest } from "@jest/globals";

import { envAddCommand } from "../dist/commands/env-add.js";
import { envListCommand } from "../dist/commands/env-list.js";
import { envRemoveCommand } from "../dist/commands/env-remove.js";

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

async function captureFailure(run) {
  const logs = [];
  const errors = [];
  const logSpy = jest.spyOn(console, "log").mockImplementation((...args) => {
    logs.push(args.join(" "));
  });
  const errorSpy = jest.spyOn(console, "error").mockImplementation((...args) => {
    errors.push(args.join(" "));
  });
  const exitError = new Error("process.exit");
  const exitSpy = jest.spyOn(process, "exit").mockImplementation((code) => {
    throw Object.assign(exitError, { code });
  });

  try {
    await run();
  } catch (error) {
    if (error !== exitError) {
      throw error;
    }
  } finally {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  }

  return {
    logs: logs.join("\n"),
    errors: errors.join("\n"),
  };
}

describe("env commands", () => {
  let originalHome;
  let tempRoot;
  let homeDir;

  beforeEach(async () => {
    originalHome = process.env.HOME;
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mcpkit-env-commands-test-"));
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

  test("adds a configured env var and reports duplicates", async () => {
    const addedOutput = await captureLogs(async () => {
      await envAddCommand("TAVILY_API_KEY");
    });
    const duplicateOutput = await captureLogs(async () => {
      await envAddCommand("TAVILY_API_KEY");
    });

    expect(addedOutput).toContain('Added "TAVILY_API_KEY"');
    expect(duplicateOutput).toContain('"TAVILY_API_KEY" is already in ~/.mcpkit/load-env.json');
  });

  test("lists configured env vars in stable order", async () => {
    await envAddCommand("ZED_API_KEY");
    await envAddCommand("TAVILY_API_KEY");

    const output = await captureLogs(async () => {
      await envListCommand();
    });

    expect(output).toContain("Global load-env environment variables");
    expect(output).toContain("  • TAVILY_API_KEY");
    expect(output).toContain("  • ZED_API_KEY");
    expect(output).toContain("Total: 2 variables");
    expect(output.indexOf("TAVILY_API_KEY")).toBeLessThan(output.indexOf("ZED_API_KEY"));
  });

  test("prints an empty-state message when no env vars are configured", async () => {
    const output = await captureLogs(async () => {
      await envListCommand();
    });

    expect(output).toContain("No environment variables configured");
  });

  test("removes configured env vars and reports missing entries", async () => {
    await envAddCommand("TAVILY_API_KEY");

    const removedOutput = await captureLogs(async () => {
      await envRemoveCommand("TAVILY_API_KEY");
    });
    const missingOutput = await captureLogs(async () => {
      await envRemoveCommand("TAVILY_API_KEY");
    });

    expect(removedOutput).toContain('Removed "TAVILY_API_KEY"');
    expect(missingOutput).toContain('"TAVILY_API_KEY" was not found in ~/.mcpkit/load-env.json');
  });

  test("prints a user-facing error for invalid env var names", async () => {
    const result = await captureFailure(async () => {
      await envAddCommand("invalid-key");
    });

    expect(result.errors).toContain("Error:");
    expect(result.errors).toContain(
      "Environment variable name must start with a letter or underscore and contain only uppercase letters, numbers, and underscores",
    );
  });
});
