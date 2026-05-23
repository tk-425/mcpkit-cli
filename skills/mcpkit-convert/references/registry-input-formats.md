# Registry Input Formats

This reference documents the one-server Registry input snippets accepted by `mcpkit registry add` for each supported agent. These are snippets to paste into the editor for one selected target, not full registry files and not project runtime config.

Supported agents:

- Claude Code
- Codex CLI
- OpenCode CLI
- Gemini CLI
- Cursor

## Shared Rules

- One invocation accepts exactly one MCP server entry.
- Server names may contain letters, numbers, hyphens, underscores, and dots, with a maximum length of 100 characters.
- JSON inputs may omit the outer braces around the one server entry because `mcpkit` wraps the pasted snippet before parsing.
- JSON inputs may include one trailing comma after the entry; `mcpkit` removes it before parsing.
- Multiple top-level entries are rejected.
- Empty input is rejected.
- Output for this skill should preserve the native one-entry shape for the selected target.

## Claude Code

`mcpkit registry add --claude` accepts one JSON entry keyed by the server name.

Stdio Registry input:

```json
"context7": {
  "command": "npx",
  "args": ["-y", "@upstash/context7-mcp@latest"]
}
```

URL Registry input:

```json
"sentry": {
  "url": "https://mcp.sentry.dev/mcp"
}
```

Accepted fields include:

- `command`: string, or array of strings for Claude-compatible command-array input
- `url`: string
- `args`: array of strings
- `env`: object with string values
- `headers`: object with string values
- `type`: string, accepted when present
- additional fields are currently preserved by the shared server config type

For command-array input, `mcpkit` normalizes:

```json
"server": {
  "command": ["npx", "-y", "pkg"]
}
```

into:

```json
"server": {
  "command": "npx",
  "args": ["-y", "pkg"]
}
```

The config must include at least one of `command` or `url`.

## Codex CLI

`mcpkit registry add --codex` accepts one TOML table under `[mcp_servers.<name>]`.

Stdio Registry input:

```toml
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp@latest"]
```

URL Registry input:

```toml
[mcp_servers.sentry]
url = "https://mcp.sentry.dev/mcp"
```

Accepted fields include:

- `command`: string
- `url`: string
- `args`: array of strings
- `env`: table with string values
- `env_vars`: array of strings
- `cwd`: string
- `bearer_token_env_var`: string
- `http_headers`: table with string values
- `env_http_headers`: table with string values
- `startup_timeout_sec`: number
- `tool_timeout_sec`: number
- `enabled`: boolean
- `required`: boolean
- `enabled_tools`: array of strings
- `disabled_tools`: array of strings

Codex requires exactly one of `command` or `url`.

Nested env table example:

```toml
[mcp_servers.my-api-server]
command = "npx"
args = ["-y", "@example/my-api-mcp"]

[mcp_servers.my-api-server.env]
API_KEY = "${API_KEY}"
```

## OpenCode CLI

`mcpkit registry add --opencode` accepts one JSON entry keyed by the server name. The input must be a single server entry, not a full `opencode.json` config.

Local Registry input:

```json
"everything": {
  "type": "local",
  "command": ["npx", "-y", "@modelcontextprotocol/server-everything"]
}
```

Remote Registry input:

```json
"context7": {
  "type": "remote",
  "url": "https://mcp.context7.com/mcp"
}
```

Accepted fields include:

- `type`: required, either `local` or `remote`
- `command`: array of strings, required for `type: "local"`
- `url`: string, required for `type: "remote"`
- `enabled`: boolean
- `timeout`: number
- `environment`: object with string values
- `headers`: object with string values
- `oauth`: object or `false`
- additional fields are currently preserved by the OpenCode config type

OpenCode full-config wrappers are rejected:

- input containing `$schema`
- input shaped like `{ "mcp": { ... } }` instead of one server entry

## Gemini CLI

`mcpkit registry add --gemini` accepts one JSON entry keyed by the server name.

Stdio Registry input:

```json
"playwright": {
  "command": "npx",
  "args": ["@playwright/mcp@latest"]
}
```

URL Registry input:

```json
"remote": {
  "url": "https://api.example.com/mcp"
}
```

HTTP URL Registry input:

```json
"remote": {
  "httpUrl": "https://api.example.com/mcp"
}
```

Accepted fields include:

- `command`: string
- `url`: string
- `httpUrl`: string
- `args`: array of strings
- `env`: object with string values
- `headers`: object with string values
- `cwd`: string
- `timeout`: non-negative number
- `trust`: boolean
- `includeTools`: array of strings
- `excludeTools`: array of strings
- additional fields are currently preserved by the Gemini config type

Gemini requires either `command`, `url`, or `httpUrl`.

## Cursor

`mcpkit registry add --cursor` accepts one JSON entry keyed by the server name.

Stdio Registry input:

```json
"playwright": {
  "type": "stdio",
  "command": "npx",
  "args": ["@playwright/mcp@latest"]
}
```

URL Registry input:

```json
"my-remote-server": {
  "url": "https://api.example.com/mcp"
}
```

Accepted fields include:

- `type`: required as `stdio` for command-based servers; if present, it must be `stdio`
- `command`: string
- `url`: string
- `args`: array of strings
- `env`: object with string values
- `headers`: object with string values
- `envFile`: string
- `auth`: object with required string `CLIENT_ID`, optional string `CLIENT_SECRET`, and optional string-array `scopes`
- additional fields are currently preserved by the Cursor config type

Cursor requires either `command` or `url`. Command-based Cursor Registry input must include `"type": "stdio"`.

## Stop Conditions

Stop and ask for corrected input when:

- The source contains multiple MCP server entries.
- The source is a full registry or project config and cannot be reduced to exactly one MCP server entry.
- The source supported agent is not one of Claude Code, Codex CLI, OpenCode CLI, Gemini CLI, or Cursor.
- OpenCode input is a full `opencode.json` wrapper rather than one server entry.
- Codex input does not contain exactly one `[mcp_servers.<name>]` table.
- Required target fields are missing, such as OpenCode `type`, OpenCode local `command`, OpenCode remote `url`, or Cursor command `type: "stdio"`.
