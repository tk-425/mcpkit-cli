import {
  parseCodexServerInput,
  parseServerInput,
  validateCodexServerConfig,
  validateEnvVarName,
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

  test("accepts uppercase env var identifiers", () => {
    expect(validateEnvVarName("TAVILY_API_KEY")).toEqual({ valid: true });
    expect(validateEnvVarName("_INTERNAL_TOKEN")).toEqual({ valid: true });
  });

  test("rejects invalid env var identifiers", () => {
    expect(validateEnvVarName("")).toEqual({
      valid: false,
      error: "Environment variable name cannot be empty",
    });
    expect(validateEnvVarName("tavily_api_key")).toEqual({
      valid: false,
      error:
        "Environment variable name must start with a letter or underscore and contain only uppercase letters, numbers, and underscores",
    });
    expect(validateEnvVarName("1PASSWORD_KEY")).toEqual({
      valid: false,
      error:
        "Environment variable name must start with a letter or underscore and contain only uppercase letters, numbers, and underscores",
    });
  });
});
