# Validation Checklist

Use this checklist before returning converted Registry input.

## Request Shape

- The source supported agent was selected explicitly.
- The source supported agent is one of Claude Code, Codex CLI, OpenCode CLI, Antigravity CLI, or Cursor.
- The input contains exactly one MCP server entry.
- Target supported agents were selected explicitly, either `all` or named targets.
- `all` expands only to Claude Code, Codex CLI, OpenCode CLI, Antigravity CLI, and Cursor.
- The task is conversion to Registry input, not project runtime config or a live registry write.

## Source Coverage

Check the selected source against `registry-input-formats.md`:

- Claude Code source: one JSON server entry keyed by name.
- Codex CLI source: exactly one TOML `[mcp_servers.<name>]` table.
- OpenCode CLI source: one JSON server entry, not full `opencode.json`, with `type: "local"` or `type: "remote"`.
- Antigravity CLI source: one JSON server entry keyed by name.
- Cursor source: one JSON server entry keyed by name, with `type: "stdio"` for command-based entries.

## Target Coverage

For each selected target, confirm the output shape:

- Claude Code output: one JSON server entry keyed by name.
- Codex CLI output: one TOML `[mcp_servers.<name>]` table.
- OpenCode CLI output: one JSON server entry with `type: "local"` or `type: "remote"`.
- Antigravity CLI output: one JSON server entry keyed by name.
- Cursor output: one JSON server entry keyed by name, with `type: "stdio"` for command-based entries.

## Registry Input Boundaries

- Output snippets are Registry input snippets, not full registry files.
- Output snippets are not project config files such as `.mcp.json`, `.codex/config.toml`, `opencode.json`, `.agents/mcp_config.json`, or `.cursor/mcp.json`.
- Output does not include wrapper runtime files or `.mcpkit/bin/` paths unless quoted only as explanatory warning context.
- Output does not mention Claude Desktop as a supported target.

## Placeholder And Field Mapping

- Env placeholders use the selected target's style:
  - Claude Code: `${VAR}`
  - Codex CLI: `${VAR}`
  - OpenCode CLI: `{env:VAR}`
  - Antigravity CLI: `${VAR}`
  - Cursor: `${env:VAR}`
- Static env values remain static strings.
- The output does not invent missing commands, URLs, env names, headers, auth fields, or tool filters.
- Command-array sources are normalized according to the target output shape.
- URL entries remain URL entries unless a documented target requires a different field name.

## Warning And Stop Behavior

- Unsupported, unknown, ambiguous, or lossy mappings are surfaced as warnings.
- Target-specific extras are warned when they are not rendered.
- Remote/http auth fields are warned when the selected target has no safe documented equivalent.
- Ambiguous JSON is not interpreted until the user selects the source supported agent.
- Multi-server input stops the conversion instead of producing a partial batch.
- Missing required fields stop the conversion instead of guessing.

## Manual Command Boundary

- Interactive `mcpkit` commands are shown only as manual user actions.
- Manual commands use this pattern:

  ```bash
  mcpkit registry add --<target>
  ```

- The agent does not run `mcpkit registry add`.
- No MCPKit home files, project config files, or live registries are written by the agent.
