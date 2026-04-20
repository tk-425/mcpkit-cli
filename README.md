# mcpkit

**MCP Server Configuration Manager** - A CLI tool to manage project-scoped MCP server configuration for Claude Code, Codex CLI, and OpenCode CLI.

## Features

- Interactive target selection for Claude Code, Codex CLI, OpenCode CLI, or any combination
- Separate native registries for Claude JSON, Codex TOML, and OpenCode JSON
- Project-level management for `.mcp.json`, `.codex/config.toml`, and `opencode.json`
- Optional project-local wrapper emission under `.mcpkit/bin/` for servers that need deterministic env loading
- Target flags for explicit workflows: `--claude`, `--codex`, and `--opencode`
- Smart validation for both JSON and TOML MCP server definitions
- Support for both stdio and streamable HTTP MCP servers

## Project Runtime Wrappers

Some MCP servers rely on env-driven startup behavior that is not consistently handled across project MCP clients. For those servers, `mcpkit` can emit a project-local wrapper command instead of copying the raw launch config into the project file.

Current behavior:

- if a selected server does not use `${VAR}`, `mcpkit` emits it directly
- if a selected server uses `${VAR}` in an easy stdio launcher shape, `mcpkit` wraps it automatically under `.mcpkit/bin/`
- if a selected server uses `${VAR}` in a supported remote/http auth shape, `mcpkit` converts it into a local `supergateway` launcher and wraps that launcher under `.mcpkit/bin/`
- if a selected server uses `${VAR}` in a remote/http shape outside that first-pass support boundary, `mcpkit` warns and skips it instead of emitting raw interpolation into project config
- OpenCode follows the same wrapper policy: supported env-interpolated remote headers and local command env interpolation are emitted through `.mcpkit/bin/*`; direct OpenCode servers remain direct

Rule of thumb:

- `${VAR}` found in a selected stdio launcher config -> wrap it
- `${VAR}` found in a supported remote/http auth config -> convert it to a local `supergateway` launcher, then wrap it
- `${VAR}` found in an unsupported remote/http config -> skip it until `mcpkit` has a safe conversion rule for that shape
- no `${VAR}` -> emit the native config directly

When wrapper-backed emission is used:

- Claude still receives native `.mcp.json`
- Codex still receives native `.codex/config.toml`
- OpenCode still receives native `opencode.json`
- the emitted `command` points at a generated wrapper under `.mcpkit/bin/`

Generated runtime layout:

```text
<project>/
  .mcp.json
  .codex/
    config.toml
  opencode.json
  .mcpkit/
    bin/
      load-env
      <server>
```

Notes:

- `.mcpkit/` is generated runtime state and `mcpkit` adds it to `.gitignore` through a managed block
- `load-env` is a macOS-oriented first-pass helper for best-effort Keychain-backed env loading
- `load-env` is derived from the env interpolation actually used by wrapper-backed servers in the current project
- for Keychain-backed loading, the macOS Keychain item service name must match the env var exactly, for example `API_KEY`
- per-server wrappers still validate required env vars before launching the underlying MCP command
- `mcpkit remove` cleans up unreferenced per-server wrappers conservatively, but does not remove `.mcpkit/` or the managed `.gitignore` block automatically in the first pass
- `mcpkit edit` is not yet wrapper-aware; editing emitted wrapper-backed entries directly can drift from registry metadata

## Keychain-Backed `${API_KEY}` Example

If a registry entry uses `${API_KEY}`, save the secret into your macOS Keychain before you add or initialize that server in a project.

Save the key:

```bash
security add-generic-password -U -a "$USER" -s API_KEY -w 'your-real-api-key'
```

Verify the key exists:

```bash
security find-generic-password -a "$USER" -s API_KEY -w
```

How this maps at runtime:

- account: your current macOS username (`$USER`)
- service: the env var name, for example `API_KEY`
- wrapper behavior: `.mcpkit/bin/load-env` tries Keychain first, exports `API_KEY` if found, then the per-server wrapper validates that `API_KEY` is set before launching the MCP server

### Example 1: stdio server using `${API_KEY}`

Add the server to the Codex registry:

```bash
mcpkit registry add --codex
```

Example input:

```toml
[mcp_servers.my-api-server]
command = "npx"
args = ["-y", "@example/my-api-mcp"]

[mcp_servers.my-api-server.env]
API_KEY = "${API_KEY}"
```

Then add it to your project:

```bash
mcpkit add --codex
```

`mcpkit` will detect `${API_KEY}`, generate a wrapper under `.mcpkit/bin/`, and emit the project entry with `command` pointing at that wrapper instead of copying the raw interpolation directly into `.codex/config.toml`.

### Example 2: remote/http server using `Authorization: Bearer ${API_KEY}`

Add the server to the Claude registry:

```bash
mcpkit registry add --claude
```

Example input:

```json
{
  "my-remote-server": {
    "url": "https://api.example.com/mcp",
    "headers": {
      "Authorization": "Bearer ${API_KEY}"
    }
  }
}
```

Then add it to your project:

```bash
mcpkit add --claude
```

For this supported remote/http auth shape, `mcpkit` converts the entry into a local `supergateway` launcher, wraps that launcher under `.mcpkit/bin/`, and still emits native project config in `.mcp.json`.

If the remote/http config uses a more complex env injection shape than the supported header pattern above, `mcpkit` will warn and skip it instead of emitting unsafe raw interpolation into project config.

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

`mcpkit` supports three target platforms:

- **Claude Code**
  - Registry: `~/.mcpkit/mcp-servers.json`
  - Project config: `.mcp.json`
- **Codex CLI**
  - Registry: `~/.mcpkit/codex-mcp-servers.toml`
  - Project config: `.codex/config.toml`
- **OpenCode CLI**
  - Registry: `~/.mcpkit/opencode-mcp-servers.json`
  - Project config: `opencode.json`

Mutating commands support:

- `--claude` for Claude only
- `--codex` for Codex only
- `--opencode` for OpenCode only
- no flag: interactive target selection

Read-only list commands support:

- `mcpkit list` shows all project targets automatically
- `mcpkit registry list` shows all registries automatically

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

OpenCode registry entry:

```bash
mcpkit registry add --opencode
```

Example input:

```json
"context7": {
  "type": "remote",
  "url": "https://mcp.context7.com/mcp",
  "headers": {
    "CONTEXT7_API_KEY": "${CONTEXT_7_KEY}"
  }
}
```

### 2. View your registries

```bash
mcpkit registry list
```

Filter to one target:

```bash
mcpkit registry list --claude
mcpkit registry list --codex
mcpkit registry list --opencode
```

### 3. Initialize a project

In your project root:

```bash
mcpkit init
```

This prompts you to choose:

- Claude Code
- Codex CLI
- OpenCode CLI
- or any combination

If you choose all targets, `mcpkit` will:

1. prompt for Claude Code servers and write `.mcp.json`
2. prompt for Codex CLI servers and write `.codex/config.toml`
3. prompt for OpenCode CLI servers and write `opencode.json`

### 4. View project servers

```bash
mcpkit list
```

Filter to one target:

```bash
mcpkit list --claude
mcpkit list --codex
mcpkit list --opencode
```

## Commands

### Project Commands

These commands operate on project-scoped files in the current directory.

#### `mcpkit init`

Create project MCP config for one or more targets.

```bash
mcpkit init
mcpkit init --claude
mcpkit init --codex
mcpkit init --opencode
```

Behavior:

- no flags: prompt for Claude, Codex, OpenCode, or any combination
- `--claude`: create or update `.mcp.json`
- `--codex`: create or update `.codex/config.toml`
- `--opencode`: create or update `opencode.json`

#### `mcpkit add`

Add servers from the selected registry into the matching project config.

```bash
mcpkit add
mcpkit add --claude
mcpkit add --codex
mcpkit add --opencode
```

#### `mcpkit refresh`

Refresh existing project MCP server entries from the matching registry using the current `mcpkit` emission rules.

```bash
mcpkit refresh
mcpkit refresh --claude
mcpkit refresh --codex
mcpkit refresh --opencode
```

Behavior:

- only touches the current directory
- updates only targets whose project config already exists
- if none of `.mcp.json`, `.codex/config.toml`, or `opencode.json` exists, tells you to run `mcpkit init` first
- refreshes only server names already present in the project config
- preserves project entries that are missing from the registry and reports them at the end
- preserves project entries that still cannot be refreshed safely and reports them at the end
- generates `.mcpkit/bin/*` and `.gitignore` entries when the refreshed project state uses wrappers
- regenerates the current project's `.mcpkit/bin/load-env` from the env vars actually required by wrapper-backed servers in that project

#### `mcpkit edit`

Add or edit a single server directly in the selected project config.

```bash
mcpkit edit
mcpkit edit --claude
mcpkit edit --codex
mcpkit edit --opencode
```

Input format:

- Claude: JSON server definition
- Codex: TOML `[mcp_servers.<name>]` definition
- OpenCode: JSON server entry

#### `mcpkit remove`

Remove servers from the selected project config.

```bash
mcpkit remove
mcpkit remove --claude
mcpkit remove --codex
mcpkit remove --opencode
```

For wrapper-backed servers, `remove` also deletes the per-server wrapper script when it is no longer referenced by any remaining Claude, Codex, or OpenCode project config in the current project.

#### `mcpkit list`

List project-scoped MCP servers.

```bash
mcpkit list
mcpkit list --verbose
mcpkit list --claude
mcpkit list --codex
mcpkit list --opencode
```

Behavior:

- no flags: show all targets automatically
- missing config files are shown as `Not configured`

### Registry Commands

These commands operate on your global registries in `~/.mcpkit/`.

#### `mcpkit registry add`

Add a server to the selected registry.

```bash
mcpkit registry add
mcpkit registry add --claude
mcpkit registry add --codex
mcpkit registry add --opencode
```

Behavior:

- no flags: prompt for target
- Claude: expects JSON
- Codex: expects TOML
- OpenCode: expects one JSON server entry

Wrapper generation is internal to `mcpkit`. Registry entries remain plain native MCP config, and `mcpkit` decides at project-emission time whether a selected server can be wrapped safely.

#### `mcpkit registry remove`

Remove servers from the selected registry.

```bash
mcpkit registry remove
mcpkit registry remove --claude
mcpkit registry remove --codex
mcpkit registry remove --opencode
```

#### `mcpkit registry list`

List registry-scoped MCP servers.

```bash
mcpkit registry list
mcpkit registry list --verbose
mcpkit registry list --claude
mcpkit registry list --codex
mcpkit registry list --opencode
```

## Implementation Docs

- [Project MCP Wrapper Revised Plan](./docs/project-mcp-wrapper-revised-plan.md)
- [Project MCP Wrapper Revised Implementation](./docs/project-mcp-wrapper-revised-implementation.md)

Behavior:

- no flags: show all registries automatically

## File Locations

- Claude registry: `~/.mcpkit/mcp-servers.json`
- Codex registry: `~/.mcpkit/codex-mcp-servers.toml`
- OpenCode registry: `~/.mcpkit/opencode-mcp-servers.json`
- Claude project config: `.mcp.json`
- Codex project config: `.codex/config.toml`
- OpenCode project config: `opencode.json`

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

### OpenCode Registry Format

File: `~/.mcpkit/opencode-mcp-servers.json`

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp"
    },
    "everything": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-everything"],
      "environment": {
        "API_KEY": "{env:API_KEY}"
      }
    }
  }
}
```

### OpenCode Project Format

File: `opencode.json`

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp"
    }
  }
}
```

`mcpkit` preserves unrelated existing OpenCode settings in `opencode.json` and updates only the `mcp` section.

When an eligible OpenCode entry is wrapper-backed, it is stored as a local OpenCode command entry:

```json
{
  "type": "local",
  "command": [".mcpkit/bin/context7"]
}
```

Existing eligible direct OpenCode entries become wrapper-backed after you run `mcpkit refresh --opencode` or `mcpkit refresh`.

First-pass OpenCode support targets `opencode.json`; `opencode.jsonc` is not modified.

## Common Workflows

### Set up Claude, Codex, and OpenCode for a new project

```bash
cd my-project
mcpkit init
```

Choose the targets when prompted, then select servers for each target in sequence.

### Add only a Codex MCP server to an existing project

```bash
mcpkit add --codex
```

### Add only an OpenCode MCP server to an existing project

```bash
mcpkit add --opencode
```

### Refresh an older project to current wrapper behavior

```bash
mcpkit refresh
```

This re-reads the server names already present in the project config from the matching `~/.mcpkit/` registry and refreshes them in place without adding new servers.

It also regenerates the current project's `.mcpkit/bin/load-env` from the union of env vars required by the wrapper-backed servers that are actually present in the project.

### Edit a single Claude server directly

```bash
mcpkit edit --claude
```

### Show all configured servers for all targets

```bash
mcpkit list
```

### Show verbose Codex registry details

```bash
mcpkit registry list --codex --verbose
```

### Show verbose OpenCode registry details

```bash
mcpkit registry list --opencode --verbose
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

### "No opencode.json found in current directory"

Run:

```bash
mcpkit init --opencode
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
mcpkit registry add --opencode
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

Common OpenCode JSON issues:

- pasting a full `opencode.json` wrapper into `mcpkit registry add --opencode`
- more than one top-level server entry
- local server `command` is not an array
- remote server is missing `url`

### Permission errors

Check registry file and directory permissions:

```bash
chmod 644 ~/.mcpkit/mcp-servers.json
chmod 644 ~/.mcpkit/codex-mcp-servers.toml
chmod 644 ~/.mcpkit/opencode-mcp-servers.json
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
