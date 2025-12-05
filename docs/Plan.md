# mcpkit - MCP Server Configuration Manager

## Overview
A CLI tool to manage MCP (Model Context Protocol) server configurations. Simplifies creating and managing `.mcp.json` files in projects.

## Project Goals
- Provide interactive selection of MCP servers from a local registry
- Allow users to easily add new MCP servers to their registry
- Generate `.mcp.json` files in project directories
- Keep the workflow simple and friction-free

## Command Structure

### `mcpkit init`
Interactive selection interface to create `.mcp.json` in current directory.

```bash
$ mcpkit init

Select MCP Servers for .mcp.json file:
[ ] chrome-devtools
[ ] playwright
[ ] shadcn
[ ] ...

Submit
```

**Behavior:**
- Reads from `~/.mcpkit/mcp-servers.json`
- Presents multi-select checkbox interface
- Creates `.mcp.json` in current directory with selected servers
- If `.mcp.json` exists: prompt to merge or overwrite

### `mcpkit add`
Add new MCP server configuration to the project's `.mcp.json`.

```bash
$ mcpkit add

Paste MCP server configuration (name + config):

"playwright": {
    "command": "npx",
    "args": [
        "@playwright/mcp@latest"
    ]
}

✓ Added "playwright" to .mcp.json
```

**Behavior:**
- Accepts JSON paste (with or without outer braces)
- Validates JSON syntax
- Extracts server name (key) and config (value)
- Adds to `.mcp.json` in current directory
- Creates `.mcp.json` if it doesn't exist
- Handles duplicates: prompt to overwrite or cancel

### `mcpkit list`
Display all MCP servers in the local registry.

```bash
$ mcpkit list

Available MCP Servers:
  • chrome-devtools
  • playwright
  • shadcn

Total: 3 servers
```

**Optional enhancements:**
- Show config details with `--verbose` flag
- Filter by name pattern

### `mcpkit remove`
Remove MCP server(s) from project's `.mcp.json`.

```bash
$ mcpkit remove playwright

✓ Removed "playwright" from .mcp.json
```

**Behavior:**
- Removes server from `.mcp.json` in current directory
- Does NOT remove from registry (`~/.mcpkit/mcp-servers.json`)
- Error if `.mcp.json` doesn't exist
- Error if server name not found in `.mcp.json`

### `mcpkit registry add`
Add new MCP server configuration to the local registry.

```bash
$ mcpkit registry add

Paste MCP server configuration (name + config):

"playwright": {
    "command": "npx",
    "args": [
        "@playwright/mcp@latest"
    ]
}

✓ Added "playwright" to registry (~/.mcpkit/mcp-servers.json)
```

**Behavior:**
- Accepts JSON paste (with or without outer braces)
- Validates JSON syntax
- Extracts server name (key) and config (value)
- Stores in `~/.mcpkit/mcp-servers.json`
- Handles duplicates: prompt to overwrite or cancel

### `mcpkit registry remove`
Remove MCP server(s) from the local registry.

```bash
$ mcpkit registry remove playwright

✓ Removed "playwright" from registry (~/.mcpkit/mcp-servers.json)
```

**Behavior:**
- Removes server from registry (`~/.mcpkit/mcp-servers.json`)
- Does NOT remove from project's `.mcp.json` files
- Error if registry doesn't exist
- Error if server name not found in registry

## File Structure

### Registry Location
`~/.mcpkit/mcp-servers.json`

```json
{
  "servers": {
    "chrome-devtools": {
      "type": "stdio",
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"],
      "env": {}
    },
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### Project Configuration
`.mcp.json` (created in project root)

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "type": "stdio",
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"],
      "env": {}
    }
  }
}
```

## Technical Decisions

### Technology Stack
**TBD** - Options:
- **Node.js** + inquirer.js (good npm ecosystem integration)
- **Go** + bubbletea (single binary, fast)
- **Python** + rich/textual (excellent TUI libraries)
- **Rust** + ratatui (performant, modern)

### JSON Parsing for `add` Command
Handle common paste variations:
```javascript
let input = userPaste.trim();
// Add outer braces if missing
if (!input.startsWith('{')) {
  input = `{${input}}`;
}
// Remove trailing comma if present
input = input.replace(/,\s*$/, '');
const parsed = JSON.parse(input);
const [name, config] = Object.entries(parsed)[0];
```

### Error Handling
- Invalid JSON paste → show error with line/column
- Missing registry file → auto-create with empty servers object
- Missing `.mcp.json` for remove → clear error message
- Duplicate server names → prompt before overwriting

## Future Enhancements (v2+)
- `mcpkit update` - Sync registry from remote source/GitHub
- `mcpkit search <query>` - Search available MCP servers
- `mcpkit validate` - Validate `.mcp.json` syntax
- Support for MCP server metadata (descriptions, tags, versions)
- Interactive config editor for existing `.mcp.json`

## Design Principles
1. **Simple and direct** - No unnecessary abstractions
2. **Copy-paste friendly** - Work with existing MCP documentation
3. **Non-destructive** - Always prompt before overwriting
4. **Local-first** - Registry lives on user's machine
5. **Future-proof** - Store configs as-is without schema assumptions

## Open Questions
1. Should `init` command merge or replace if `.mcp.json` exists?
2. Should `remove` have a `--from-registry` flag to remove from global registry?
3. Should there be a default set of MCP servers in initial registry?
4. Should registry support versioning/timestamps?
