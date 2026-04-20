import { describe, expect, test } from "@jest/globals";

import {
  getProjectTargetAdapter,
  sortCaseInsensitive,
} from "../dist/utils/project-target-adapter.js";

describe("project target adapter", () => {
  test("sortCaseInsensitive sorts names without case sensitivity", () => {
    expect(sortCaseInsensitive(["zeta", "Alpha", "beta"])).toEqual([
      "Alpha",
      "beta",
      "zeta",
    ]);
  });

  test("Claude adapter serializes a single server as JSON", () => {
    const adapter = getProjectTargetAdapter("claude");
    const serialized = adapter.serializeServerForEdit("context7", {
      command: "npx",
      args: ["-y", "@upstash/context7-mcp@latest"],
    });

    expect(serialized).toContain('"context7"');
    expect(serialized).toContain('"command": "npx"');
    expect("messages" in adapter).toBe(false);
  });

  test("Codex adapter serializes a single server as TOML", () => {
    const adapter = getProjectTargetAdapter("codex");
    const serialized = adapter.serializeServerForEdit("context7", {
      command: "npx",
      args: ["-y", "@upstash/context7-mcp@latest"],
    });

    expect(serialized).toContain("[mcp_servers.context7]");
    expect(serialized).toContain('command = "npx"');
    expect("messages" in adapter).toBe(false);
  });

  test("OpenCode adapter serializes a single server as native JSON", () => {
    const adapter = getProjectTargetAdapter("opencode");
    const serialized = adapter.serializeServerForEdit("context7", {
      type: "remote",
      url: "https://mcp.context7.com/mcp",
    });

    expect(serialized).toContain('"context7"');
    expect(serialized).toContain('"url": "https://mcp.context7.com/mcp"');
    expect(serialized).not.toContain('"$schema"');
    expect(serialized).not.toContain('"mcp"');
    expect("messages" in adapter).toBe(false);
  });
});
