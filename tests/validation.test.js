import {
  parseCodexServerInput,
  parseOpenCodeServerInput,
  parseServerInput,
  validateServerConfig,
  validateCodexServerConfig,
  validateOpenCodeServerConfig,
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

  test("parses OpenCode JSON server input", () => {
    const parsed = parseOpenCodeServerInput(`
      "context7": {
        "type": "remote",
        "url": "https://mcp.context7.com/mcp"
      }
    `);

    expect(parsed.name).toBe("context7");
    expect(parsed.config).toEqual({
      type: "remote",
      url: "https://mcp.context7.com/mcp",
    });
  });

  test("parses braced OpenCode JSON server input", () => {
    const parsed = parseOpenCodeServerInput(`
      {
        "context7": {
          "type": "remote",
          "url": "https://mcp.context7.com/mcp"
        }
      }
    `);

    expect(parsed.name).toBe("context7");
    expect(parsed.config).toEqual({
      type: "remote",
      url: "https://mcp.context7.com/mcp",
    });
  });

  test("parses OpenCode server named mcp", () => {
    const parsed = parseOpenCodeServerInput(`
      "mcp": {
        "type": "remote",
        "url": "https://mcp.example.com/mcp"
      }
    `);

    expect(parsed.name).toBe("mcp");
    expect(parsed.config).toEqual({
      type: "remote",
      url: "https://mcp.example.com/mcp",
    });
  });

  test("accepts OpenCode local server config", () => {
    expect(
      validateOpenCodeServerConfig({
        type: "local",
        command: ["npx", "-y", "@modelcontextprotocol/server-everything"],
        environment: {
          API_KEY: "{env:API_KEY}",
        },
      }),
    ).toEqual({ valid: true });
  });

  test("rejects OpenCode input with multiple servers", () => {
    expect(() =>
      parseOpenCodeServerInput(`
        {
          "one": { "type": "remote", "url": "https://one.example.com/mcp" },
          "two": { "type": "remote", "url": "https://two.example.com/mcp" }
        }
      `),
    ).toThrow("Please provide only one OpenCode server configuration at a time");
  });

  test("rejects full OpenCode config wrapper as server input", () => {
    expect(() =>
      parseOpenCodeServerInput(`
        {
          "$schema": "https://opencode.ai/config.json",
          "mcp": {
            "context7": {
              "type": "remote",
              "url": "https://mcp.context7.com/mcp"
            }
          }
        }
      `),
    ).toThrow("OpenCode input must be a single server entry, not a full opencode.json config");
  });

  test("rejects wrapper-shaped mcp value as OpenCode server input", () => {
    expect(() =>
      parseOpenCodeServerInput(`
        {
          "mcp": {
            "context7": {
              "type": "remote",
              "url": "https://mcp.context7.com/mcp"
            }
          }
        }
      `),
    ).toThrow("OpenCode input must be a single server entry, not a full opencode.json config");
  });

  test("rejects OpenCode local config without command array", () => {
    expect(
      validateOpenCodeServerConfig({
        type: "local",
        command: "npx",
      }),
    ).toEqual({
      valid: false,
      error: '"command" field must be an array',
    });
  });

  test("rejects OpenCode remote config without string url", () => {
    expect(
      validateOpenCodeServerConfig({
        type: "remote",
      }),
    ).toEqual({
      valid: false,
      error: '"url" field must be a string',
    });
  });

  test("rejects OpenCode oauth values that are not object or false", () => {
    expect(
      validateOpenCodeServerConfig({
        type: "remote",
        url: "https://example.com/mcp",
        oauth: "disabled",
      }),
    ).toEqual({
      valid: false,
      error: '"oauth" field must be an object or false',
    });
  });
});
