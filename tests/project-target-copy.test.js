import { describe, expect, test } from "@jest/globals";

import {
  getAddProjectTargetCopy,
  getCommonProjectTargetCopy,
  getEditProjectTargetCopy,
  getUpdateProjectTargetCopy,
} from "../dist/utils/project-target-copy/index.js";

describe("project target copy", () => {
  test("returns Claude-specific common and add copy", () => {
    const commonCopy = getCommonProjectTargetCopy("claude");
    const addCopy = getAddProjectTargetCopy("claude");

    expect(commonCopy.missingConfigError).toContain(".mcp.json");
    expect(addCopy.selectionMessage).toContain("Claude Code");
  });

  test("returns Codex-specific common and add copy", () => {
    const commonCopy = getCommonProjectTargetCopy("codex");
    const addCopy = getAddProjectTargetCopy("codex");
    const updateCopy = getUpdateProjectTargetCopy("codex");

    expect(commonCopy.missingConfigError).toContain(".codex/config.toml");
    expect(addCopy.selectionMessage).toContain("Codex CLI");
    expect(updateCopy.summaryLabel).toBe("Codex CLI");
  });

  test("returns OpenCode-specific common and add copy", () => {
    const commonCopy = getCommonProjectTargetCopy("opencode");
    const addCopy = getAddProjectTargetCopy("opencode");
    const editCopy = getEditProjectTargetCopy("opencode");
    const updateCopy = getUpdateProjectTargetCopy("opencode");

    expect(commonCopy.missingConfigError).toContain("opencode.json");
    expect(addCopy.selectionMessage).toContain("OpenCode CLI");
    expect(editCopy.instruction).toBe("  1. Edit the OpenCode JSON server entry");
    expect(updateCopy.summaryLabel).toBe("OpenCode CLI");
  });
});
