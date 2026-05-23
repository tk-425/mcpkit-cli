---
name: mcpkit-convert
description: Convert exactly one MCP server entry from one supported agent format into paste-ready mcpkit Registry input for selected supported agents.
---

# MCPKit Convert

Use this skill when a user wants equivalent mcpkit Registry input for an MCP server entry they found in another supported agent format.

## Supported Agents

- Claude Code
- Codex CLI
- OpenCode CLI
- Gemini CLI
- Cursor

## Required Questions

Before converting, ask:

1. Which supported agent is the source format?
2. What is the single MCP server entry to convert?
3. Which target supported agents should receive output: `all`, or selected agents from the supported list?

If the user provides multiple MCP server entries, stop and ask for exactly one MCP server entry.

## Flow

1. Read `references/registry-input-formats.md` for source and target Registry input shapes.
2. Read `references/conversion-rules.md` for canonical field mapping, placeholder handling, and warning rules.
3. Use `references/examples.md` only when a concrete example helps resolve output shape.
4. Check the result with `references/validation-checklist.md`.
5. Return paste-ready Registry input snippets for each selected target.
6. Show the manual registry command pattern for the user to run:

   ```bash
   mcpkit registry add --<target>
   ```

Do not run interactive `mcpkit` commands. Do not write to MCPKit home, project config files, or live registries.

## Output Rules

- Produce Registry input only, not full registry files or project runtime config.
- Preserve one MCP server entry per invocation.
- Include warnings for unsupported, unknown, ambiguous, or lossy mappings.
- Keep target choices explicit. `all` means Claude Code, Codex CLI, OpenCode CLI, Gemini CLI, and Cursor.
