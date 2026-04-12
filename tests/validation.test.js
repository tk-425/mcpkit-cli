import {
  parseCodexServerInput,
  parseServerInput,
  validateServerConfig,
  validateCodexServerConfig,
} from "../dist/utils/validation.js";

describe("validation utilities", () => {
  test("parses Claude JSON server input", () => {
    const parsed = parseServerInput(`
      "context7": {
        "command": "npx",
        "args": ["-y", "@upstash/context7-mcp@latest"]
      }
    `);

    expect(parsed.name).toBe("context7");
    expect(parsed.config).toEqual({
      command: "npx",
      args: ["-y", "@upstash/context7-mcp@latest"],
    });
  });

  test("parses Codex TOML server input", () => {
    const parsed = parseCodexServerInput(`
      [mcp_servers.context7]
      command = "npx"
      args = ["-y", "@upstash/context7-mcp@latest"]
    `);

    expect(parsed.name).toBe("context7");
    expect(parsed.config).toEqual({
      command: "npx",
      args: ["-y", "@upstash/context7-mcp@latest"],
    });
  });

  test("rejects Codex config when both command and url are present", () => {
    expect(
      validateCodexServerConfig({
        command: "npx",
        url: "https://example.com/mcp",
      }),
    ).toEqual({
      valid: false,
      error:
        'Codex server configuration must include exactly one of "command" or "url"',
    });
  });

  test("rejects Claude headers when values are not strings", () => {
    expect(
      validateServerConfig({
        type: "remote",
        url: "https://example.com/mcp",
        headers: {
          Authorization: 123,
        },
      }),
    ).toEqual({
      valid: false,
      error: 'All values in "headers" must be strings',
    });
  });
});
