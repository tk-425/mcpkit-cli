# mcpkit

**MCP Server Configuration Manager** - A CLI tool to manage project-scoped MCP server configuration for both Claude Code and Codex CLI.

## Features

- Interactive target selection for Claude Code, Codex CLI, or both
- Separate native registries for Claude JSON and Codex TOML
- Project-level management for `.mcp.json` and `.codex/config.toml`
- Optional project-local wrapper emission under `.mcpkit/bin/` for servers that need deterministic env loading
- Target flags for explicit workflows: `--claude` and `--codex`
- Smart validation for both JSON and TOML MCP server definitions
- Support for both stdio and streamable HTTP MCP servers

## Project Runtime Wrappers

Some MCP servers rely on env-driven startup behavior that is not consistently handled across project MCP clients. For those servers, `mcpkit` can emit a project-local wrapper command instead of copying the raw launch config into the project file.

Current behavior:

- if a selected server does not use `${VAR}`, `mcpkit` emits it directly
- if a selected server uses `${VAR}` in an easy stdio launcher shape, `mcpkit` wraps it automatically under `.mcpkit/bin/`
- if a selected server uses `${VAR}` in a remote/http shape that cannot be converted safely yet, `mcpkit` warns and skips it instead of emitting raw interpolation into project config

Rule of thumb:

- `${VAR}` found in a selected stdio launcher config -> wrap it
- `${VAR}` found in a selected remote/http config -> skip it until `mcpkit` has a safe conversion rule for that server
- no `${VAR}` -> emit the native config directly

When wrapper-backed emission is used:

- Claude still receives native `.mcp.json`
- Codex still receives native `.codex/config.toml`
- the emitted `command` points at a generated wrapper under `.mcpkit/bin/`

Generated runtime layout:

```text
<project>/
  .mcp.json
  .codex/
    config.toml
  .mcpkit/
    bin/
      load-env
      <server>
```

Notes:

- `.mcpkit/` is generated runtime state and `mcpkit` adds it to `.gitignore` through a managed block
- `load-env` is a macOS-oriented first-pass helper for best-effort Keychain-backed env loading
- per-server wrappers still validate required env vars before launching the underlying MCP command
- `mcpkit remove` cleans up unreferenced per-server wrappers conservatively, but does not remove `.mcpkit/` or the managed `.gitignore` block automatically in the first pass
- `mcpkit edit` is not yet wrapper-aware; editing emitted wrapper-backed entries directly can drift from registry metadata

## Installation

1. Clone the repository:

```bash
git clone https://github.com/tk-425/mcpkit-cli.git
cd mcpkit
```

2. Install dependencies:

```bash
pnpm install
```

3. Build the binary:

```bash
bun run build:binary
```

4. Install globally:

```bash
sudo install -m 755 ./mcpkit /usr/local/bin/mcpkit
```

Verify:

```bash
mcpkit --version
```

## Command Model

`mcpkit` supports two target platforms:

- **Claude Code**
  - Registry: `~/.mcpkit/mcp-servers.json`
  - Project config: `.mcp.json`
- **Codex CLI**
  - Registry: `~/.mcpkit/codex-mcp-servers.toml`
  - Project config: `.codex/config.toml`

Mutating commands support:

- `--claude` for Claude only
- `--codex` for Codex only
- no flag: interactive target selection

Read-only list commands support:

- `mcpkit list` shows both project targets automatically
- `mcpkit registry list` shows both registries automatically

## Quick Start

### 1. Add servers to your registry

Claude registry entry:

```bash
mcpkit registry add --claude
```

Example input:

```json
"context7": {
  "command": "npx",
  "args": ["-y", "@upstash/context7-mcp@latest"]
}
```

Codex registry entry:

```bash
mcpkit registry add --codex
```

Example input:

```toml
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp@latest"]
```

### 2. View your registries

```bash
mcpkit registry list
```

Filter to one target:

```bash
mcpkit registry list --claude
mcpkit registry list --codex
```

### 3. Initialize a project

In your project root:

```bash
mcpkit init
```

This prompts you to choose:

- Claude Code
- Codex CLI
- or both

If you choose both, `mcpkit` will:

1. prompt for Claude Code servers and write `.mcp.json`
2. prompt for Codex CLI servers and write `.codex/config.toml`

### 4. View project servers

```bash
mcpkit list
```

Filter to one target:

```bash
mcpkit list --claude
mcpkit list --codex
```

## Commands

### Project Commands

These commands operate on project-scoped files in the current directory.

#### `mcpkit init`

Create project MCP config for one or both targets.

```bash
mcpkit init
mcpkit init --claude
mcpkit init --codex
```

Behavior:

- no flags: prompt for Claude, Codex, or both
- `--claude`: create or update `.mcp.json`
- `--codex`: create or update `.codex/config.toml`

#### `mcpkit add`

Add servers from the selected registry into the matching project config.

```bash
mcpkit add
mcpkit add --claude
mcpkit add --codex
```

#### `mcpkit update`

Refresh existing project MCP server entries from the matching registry using the current `mcpkit` emission rules.

```bash
mcpkit update
mcpkit update --claude
mcpkit update --codex
```

Behavior:

- only touches the current directory
- updates only targets whose project config already exists
- if neither `.mcp.json` nor `.codex/config.toml` exists, tells you to run `mcpkit init` first
- refreshes only server names already present in the project config
- preserves project entries that are missing from the registry and reports them at the end
- preserves project entries that still cannot be refreshed safely and reports them at the end
- generates `.mcpkit/bin/*` and `.gitignore` entries when the refreshed project state uses wrappers

#### `mcpkit edit`

Add or edit a single server directly in the selected project config.

```bash
mcpkit edit
mcpkit edit --claude
mcpkit edit --codex
```

Input format:

- Claude: JSON server definition
- Codex: TOML `[mcp_servers.<name>]` definition

#### `mcpkit remove`

Remove servers from the selected project config.

```bash
mcpkit remove
mcpkit remove --claude
mcpkit remove --codex
```

For wrapper-backed servers, `remove` also deletes the per-server wrapper script when it is no longer referenced by any remaining Claude or Codex project config in the current project.

#### `mcpkit list`

List project-scoped MCP servers.

```bash
mcpkit list
mcpkit list --verbose
mcpkit list --claude
mcpkit list --codex
```

Behavior:

- no flags: show both targets automatically
- missing config files are shown as `Not configured`

### Registry Commands

These commands operate on your global registries in `~/.mcpkit/`.

#### `mcpkit registry add`

Add a server to the selected registry.

```bash
mcpkit registry add
mcpkit registry add --claude
mcpkit registry add --codex
```

Behavior:

- no flags: prompt for target
- Claude: expects JSON
- Codex: expects TOML

Wrapper generation is internal to `mcpkit`. Registry entries remain plain native MCP config, and `mcpkit` decides at project-emission time whether a selected server can be wrapped safely.

#### `mcpkit registry remove`

Remove servers from the selected registry.

```bash
mcpkit registry remove
mcpkit registry remove --claude
mcpkit registry remove --codex
```

#### `mcpkit registry list`

List registry-scoped MCP servers.

```bash
mcpkit registry list
mcpkit registry list --verbose
mcpkit registry list --claude
mcpkit registry list --codex
```

## Implementation Docs

- [Project MCP Wrapper Revised Plan](./docs/project-mcp-wrapper-revised-plan.md)
- [Project MCP Wrapper Revised Implementation](./docs/project-mcp-wrapper-revised-implementation.md)

Behavior:

- no flags: show both registries automatically

## File Locations

- Claude registry: `~/.mcpkit/mcp-servers.json`
- Codex registry: `~/.mcpkit/codex-mcp-servers.toml`
- Claude project config: `.mcp.json`
- Codex project config: `.codex/config.toml`

## Configuration Formats

### Claude Registry Format

File: `~/.mcpkit/mcp-servers.json`

```json
{
  "servers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "sentry": {
      "url": "https://mcp.sentry.dev/mcp"
    }
  }
}
```

### Claude Project Format

File: `.mcp.json`

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

### Codex Registry Format

File: `~/.mcpkit/codex-mcp-servers.toml`

```toml
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp@latest"]

[mcp_servers.sentry]
url = "https://mcp.sentry.dev/mcp"
```

### Codex Project Format

File: `.codex/config.toml`

```toml
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp@latest"]
```

`mcpkit` preserves unrelated existing Codex settings in `.codex/config.toml` and updates only the `mcp_servers` section.

## Common Workflows

### Set up both Claude and Codex for a new project

```bash
cd my-project
mcpkit init
```

Choose both targets when prompted, then select servers for each target in sequence.

### Add only a Codex MCP server to an existing project

```bash
mcpkit add --codex
```

### Refresh an older project to current wrapper behavior

```bash
mcpkit update
```

This re-reads the server names already present in the project config from the matching `~/.mcpkit/` registry and refreshes them in place without adding new servers.

### Edit a single Claude server directly

```bash
mcpkit edit --claude
```

### Show all configured servers for both targets

```bash
mcpkit list
```

### Show verbose Codex registry details

```bash
mcpkit registry list --codex --verbose
```

## Troubleshooting

### "No .mcp.json found in current directory"

Run:

```bash
mcpkit init --claude
```

or:

```bash
mcpkit init
```

### "No .codex/config.toml found in current directory"

Run:

```bash
mcpkit init --codex
```

or:

```bash
mcpkit init
```

### "No MCP servers in registry"

Add servers first:

```bash
mcpkit registry add --claude
mcpkit registry add --codex
```

### Invalid JSON or TOML input

`mcpkit` validates input before writing files.

Common JSON issues:

- missing quotes around keys
- trailing commas
- unmatched braces

Common TOML issues:

- missing `[mcp_servers.<name>]` table header
- invalid array syntax
- malformed quotes

### Permission errors

Check registry file and directory permissions:

```bash
chmod 644 ~/.mcpkit/mcp-servers.json
chmod 644 ~/.mcpkit/codex-mcp-servers.toml
chmod 755 ~/.mcpkit
```

## Development

```bash
git clone https://github.com/tk-425/mcpkit-cli.git
cd mcpkit

pnpm install
pnpm build
pnpm test

bun run build:binary
```

## License

ISC

## Contributing

Issues and pull requests are welcome.

## Links

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [GitHub Repository](https://github.com/tk-425/mcpkit-cli)
- [Report Issues](https://github.com/tk-425/mcpkit-cli/issues)
