import {
  buildLoadEnvScript,
  buildWrapperScript,
  shellQuote,
} from "../dist/utils/wrapper-templates.js";

describe("wrapper template builders", () => {
  test("shellQuote escapes single quotes", () => {
    expect(shellQuote("it's fine")).toBe("'it'\\''s fine'");
  });

  test("buildLoadEnvScript includes standard env loading and exec", () => {
    const script = buildLoadEnvScript();

    expect(script).toContain("CONTEXT_7_KEY");
    expect(script).toContain("TAVILY_API_KEY");
    expect(script).toContain('exec "$@"');
  });

  test("buildWrapperScript includes required env checks and static env exports", () => {
    const script = buildWrapperScript({
      scriptName: "tavily-mcp",
      requiredEnv: ["TAVILY_API_KEY"],
      staticEnv: {
        DEFAULT_PARAMETERS: '{"include_images": true}',
      },
      exec: {
        command: "npx",
        args: ["-y", "tavily-mcp@latest"],
      },
    });

    expect(script).toContain('exec "$script_dir/load-env"');
    expect(script).toContain("TAVILY_API_KEY is not set");
    expect(script).toContain("DEFAULT_PARAMETERS");
    expect(script).toContain("tavily-mcp@latest");
  });

  test("buildWrapperScript supports forwarded env, templated env, and templated args", () => {
    const script = buildWrapperScript({
      scriptName: "n8n-mcp",
      requiredEnv: ["N8N_MCP_KEY"],
      forwardedEnv: {
        API_KEY: "N8N_MCP_KEY",
      },
      templatedEnv: {
        HEADER_VALUE: "Bearer ${N8N_MCP_KEY}",
      },
      exec: {
        command: "npx",
        argTemplates: [
          "-y",
          "supergateway",
          "--header",
          "authorization:Bearer ${N8N_MCP_KEY}",
        ],
      },
    });

    expect(script).toContain('export API_KEY="$N8N_MCP_KEY"');
    expect(script).toContain('export HEADER_VALUE="Bearer ${N8N_MCP_KEY}"');
    expect(script).toContain('"authorization:Bearer ${N8N_MCP_KEY}"');
  });

  test("buildWrapperScript can skip load-env", () => {
    const script = buildWrapperScript({
      scriptName: "context7-mcp",
      useLoadEnv: false,
      exec: {
        command: "npx",
        args: ["-y", "@upstash/context7-mcp"],
        envArgs: [{ flag: "--api-key", envName: "CONTEXT_7_KEY" }],
      },
    });

    expect(script).not.toContain('exec "$script_dir/load-env"');
    expect(script).toContain(`exec 'npx' '-y' '@upstash/context7-mcp' '--api-key' "$CONTEXT_7_KEY"`);
  });
});
