# Conversion Rules

Use these rules to convert one source MCP server entry into target-native Registry input.

This skill is documentation-driven. It should not write to MCPKit home, mutate registry files, run interactive `mcpkit` commands, install dependencies, or invent support for an agent outside the supported list.

## Supported Agents

- Claude Code
- Codex CLI
- OpenCode CLI
- Gemini CLI
- Cursor

## Canonical MCP Server Entry

Normalize the selected source entry into one canonical shape before rendering target Registry input:

- `name`: the server name from the source entry key or Codex table suffix.
- `transport`: `stdio`, `url`, or `unknown`.
- `command`: a string command for stdio entries.
- `args`: string array, defaulting to an empty array.
- `url`: remote endpoint from `url` or Gemini `httpUrl`.
- `env`: string record from Claude/Gemini/Cursor `env`, Codex `env`, or OpenCode `environment`.
- `headers`: string record from `headers` or Codex `http_headers`.
- `env_http_headers`: Codex string record for env-backed HTTP headers.
- `cwd`: working directory from `cwd`.
- `timeout`: target-specific timeout fields.
- `target_specific_extras`: fields that do not map cleanly to all targets.
- `warnings`: warnings gathered during parse, normalization, and render.

The canonical model is an internal reasoning aid. Output must remain target-native Registry input snippets.

## Source Parse Notes

### Claude Code

- Source shape is one JSON entry keyed by the server name.
- `command` may be a string or an array of strings.
- If `command` is an array, normalize the first item to canonical `command` and append the remaining items before any existing `args`.
- `url`, `args`, `env`, `headers`, and `type` can be read directly when present.
- Additional unknown fields become `target_specific_extras`.

### Codex CLI

- Source shape is one TOML table under `[mcp_servers.<name>]`.
- Read `command`, `url`, `args`, `env`, `env_vars`, `cwd`, `bearer_token_env_var`, `http_headers`, `env_http_headers`, `startup_timeout_sec`, `tool_timeout_sec`, `enabled`, `required`, `enabled_tools`, and `disabled_tools`.
- Codex requires exactly one of `command` or `url`.
- Treat Codex timeout, enablement, required, and tool-list fields as target-specific extras when rendering other targets.

### OpenCode CLI

- Source shape is one JSON entry keyed by the server name.
- `type: "local"` maps to canonical `stdio`.
- `type: "remote"` maps to canonical `url`.
- For local entries, normalize the `command` array by using the first item as canonical `command` and the remaining items as canonical `args`.
- `environment` maps to canonical `env`.
- `headers`, `enabled`, `timeout`, and `oauth` should be retained for target-specific rendering or warnings.

### Gemini CLI

- Source shape is one JSON entry keyed by the server name.
- `command`, `args`, `env`, `url`, `httpUrl`, `headers`, `cwd`, `timeout`, `trust`, `includeTools`, and `excludeTools` can be read directly.
- Treat `httpUrl` as canonical `url`; warn when rendering to targets that only document `url`.
- Treat Gemini `trust`, `includeTools`, and `excludeTools` as target-specific extras for other targets.

### Cursor

- Source shape is one JSON entry keyed by the server name.
- Command-based entries must include `type: "stdio"`.
- `command`, `args`, `env`, `url`, `headers`, `envFile`, and `auth` can be read directly.
- Cursor `envFile` and `auth` are target-specific extras for other targets.

## Target Rendering

### Claude Code

Render one JSON entry:

```json
"server-name": {
  "command": "npx",
  "args": ["-y", "pkg"]
}
```

Rules:

- For `stdio`, render `command`, optional `args`, optional `env`, optional `cwd` only as a warning unless the source already used a Claude-compatible field.
- For URL entries, render `url` and optional `headers`.
- Do not render Codex-only, OpenCode-only, Gemini-only, or Cursor-only extras silently.

### Codex CLI

Render one TOML table:

```toml
[mcp_servers.server-name]
command = "npx"
args = ["-y", "pkg"]
```

Rules:

- For `stdio`, render `command`, optional `args`, optional `[mcp_servers.<name>.env]`, and optional `cwd`.
- For URL entries, render `url`.
- Render Codex HTTP auth fields only when they came from Codex or map safely from simple source headers.
- Do not render both `command` and `url`.
- Warn for fields without Codex equivalents.

### OpenCode CLI

Render one JSON entry:

```json
"server-name": {
  "type": "local",
  "command": ["npx", "-y", "pkg"]
}
```

Rules:

- For `stdio`, render `type: "local"` and combine canonical `command` plus `args` into the OpenCode `command` array.
- For URL entries, render `type: "remote"` and `url`.
- Render canonical `env` as `environment`.
- Render `headers` for remote entries when values can be represented safely.
- Warn for target-specific extras without OpenCode equivalents.

### Gemini CLI

Render one JSON entry:

```json
"server-name": {
  "command": "npx",
  "args": ["pkg"]
}
```

Rules:

- For `stdio`, render `command`, optional `args`, optional `env`, and optional `cwd`.
- For URL entries, prefer `url` unless the source explicitly used Gemini `httpUrl`.
- Render `headers` for URL entries when values can be represented safely.
- Warn for target-specific extras without Gemini equivalents.

### Cursor

Render one JSON entry:

```json
"server-name": {
  "type": "stdio",
  "command": "npx",
  "args": ["pkg"]
}
```

Rules:

- For `stdio`, render `type: "stdio"`, `command`, optional `args`, optional `env`, and optional `envFile` only if source support is clear.
- For URL entries, render `url` and optional `headers`.
- Do not render `type` on URL-only Cursor entries unless a documented source requires it.
- Warn for target-specific extras without Cursor equivalents.

## Env Placeholder Rendering

When a value is a pure or embedded env placeholder, render it in the selected target's documented style:

- Claude Code: `${VAR}`
- Codex CLI: `${VAR}`
- OpenCode CLI: `{env:VAR}`
- Gemini CLI: `${VAR}`
- Cursor: `${env:VAR}`

Normalize these source forms as references to the same env name:

- `${VAR}`
- `{env:VAR}`
- `${env:VAR}`

Preserve static env values as static strings. Do not invent placeholder names.

## Warning Rules

Warnings are part of the output. Use them instead of silently forcing unsupported or lossy mappings.

Warn when:

- A source field has no documented equivalent in the selected target.
- A field is target-specific, such as Codex `enabled_tools`, OpenCode `oauth`, Gemini `trust`, or Cursor `auth`.
- A remote/http entry carries auth or env injection that cannot be represented safely in the selected target.
- Codex `bearer_token_env_var` or `env_http_headers` would need conversion to a target with no equivalent documented field.
- Gemini `httpUrl` is rendered to a target that only documents `url`.
- A source JSON shape is ambiguous across Claude Code, Gemini CLI, Cursor, or general MCP examples and the user has not selected the source supported agent.
- A command-array source is rendered to a target that expects a string command plus args.
- Unknown fields are present and not covered by target rendering rules.

Stop instead of warning when:

- The input contains multiple MCP server entries.
- The source supported agent is missing or unsupported.
- Required target fields cannot be derived, such as a stdio entry without a command or a URL entry without a URL.
- OpenCode source input is a full `opencode.json` wrapper rather than one server entry.
- Codex source input does not contain exactly one `[mcp_servers.<name>]` table.

## Manual Command Handoff

After rendering snippets, show the target command as a manual user action:

```bash
mcpkit registry add --<target>
```

Do not run this command for the user because it opens an interactive editor and writes to MCPKit home.
