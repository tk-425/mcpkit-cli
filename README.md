# mcpkit

**MCP Server Configuration Manager** - A CLI tool to easily manage `.mcp.json` files for Model Context Protocol (MCP) servers.

## Features

- 🎯 **Interactive server selection** - Multi-select interface to choose from your registry
- 📦 **Global registry** - Store server configurations once, use in any project
- 🔄 **Project-level management** - Add/remove servers per project
- ✅ **Smart validation** - Validates JSON syntax and server configurations
- 🔌 **Multiple server types** - Supports both stdio and streaming MCP servers
- 🎨 **User-friendly** - Clear instructions and helpful error messages

## Installation

### From npm (when published)

```bash
npm install -g mcpkit
```

Or use directly with npx:

```bash
npx mcpkit
```

### Local Installation (for development)

1. Clone the repository:
```bash
git clone https://github.com/tk-425/mcpkit-cli.git
cd mcpkit
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Link globally for local testing:
```bash
npm link
```

Now you can use `mcpkit` from anywhere on your system. The command will run from your local development directory.

To unlink later:
```bash
npm unlink -g mcpkit
```

## Quick Start

### 1. Add servers to your global registry

```bash
mcpkit registry add
```

This opens your editor where you can paste server configurations:

**Stdio server example:**
```json
"playwright": {
  "command": "npx",
  "args": ["@playwright/mcp@latest"]
}
```

**Streaming server example:**
```json
"context7": {
  "url": "https://api.context7.ai/mcp"
}
```

### 2. View your registry

```bash
mcpkit registry list
```

### 3. Initialize a project

In your project directory:

```bash
mcpkit init
```

This presents a multi-select interface to choose which servers from your registry to add to the project's `.mcp.json` file.

### 4. View project servers

```bash
mcpkit list
```

## Commands

### Project Commands

These commands work with the `.mcp.json` file in your current directory.

#### `mcpkit init`
Create a new `.mcp.json` file by selecting servers from your registry.

```bash
mcpkit init
```

**Interactive features:**
- Multi-select checkbox interface
- Merge or overwrite existing `.mcp.json`
- Use arrow keys to navigate, space to select, enter to confirm

#### `mcpkit add`
Add a server directly to the current project's `.mcp.json`.

```bash
mcpkit add
```

Opens an editor to paste server configuration. Creates `.mcp.json` if it doesn't exist.

#### `mcpkit remove <server-name>`
Remove a server from the current project's `.mcp.json`.

```bash
mcpkit remove playwright
```

#### `mcpkit list`
Display all servers configured in the current project.

```bash
mcpkit list

# Show detailed configurations
mcpkit list --verbose
```

### Registry Commands

These commands work with your global registry at `~/.mcpkit/mcp-servers.json`.

#### `mcpkit registry add`
Add a new server to your global registry.

```bash
mcpkit registry add
```

Opens an editor where you can paste server configurations from MCP documentation.

#### `mcpkit registry remove <server-name>`
Remove a server from your global registry.

```bash
mcpkit registry remove playwright
```

#### `mcpkit registry list`
Display all servers in your global registry.

```bash
mcpkit registry list

# Show detailed configurations
mcpkit registry list --verbose
```

## File Locations

- **Global registry**: `~/.mcpkit/mcp-servers.json`
- **Project config**: `.mcp.json` (in your project directory)

## Configuration Format

### Registry Format (`~/.mcpkit/mcp-servers.json`)

```json
{
  "servers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "chrome-devtools": {
      "type": "stdio",
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"],
      "env": {}
    },
    "context7": {
      "url": "https://api.context7.ai/mcp"
    }
  }
}
```

### Project Format (`.mcp.json`)

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "context7": {
      "url": "https://api.context7.ai/mcp"
    }
  }
}
```

## Server Types

### Stdio Servers

Use `command` and `args` fields:

```json
"server-name": {
  "command": "npx",
  "args": ["package-name@latest"],
  "type": "stdio",
  "env": {
    "API_KEY": "your-key"
  }
}
```

### Streaming Servers

Use `url` field:

```json
"server-name": {
  "url": "https://api.example.com/mcp"
}
```

## Common Workflows

### Setting up a new project

```bash
# Add servers to registry (one time)
mcpkit registry add
# (paste playwright config)

mcpkit registry add
# (paste chrome-devtools config)

# In your project directory
cd my-project
mcpkit init
# (select servers you need)

# Verify
mcpkit list
```

### Adding a server to an existing project

```bash
# Option 1: Add from registry
mcpkit init
# (select additional servers to merge)

# Option 2: Add directly
mcpkit add
# (paste server config)
```

### Managing your registry

```bash
# View all available servers
mcpkit registry list

# Add a new server
mcpkit registry add

# Remove unused servers
mcpkit registry remove old-server

# View details
mcpkit registry list --verbose
```

## Editor Configuration

The `add` commands use your system's default editor. Set it with:

```bash
export EDITOR=nano    # or vim, code, etc.
```

## Troubleshooting

### "No .mcp.json found in current directory"

Run `mcpkit init` to create one, or `cd` to the correct project directory.

### "No MCP servers in registry"

Add servers to your registry first:

```bash
mcpkit registry add
```

### "Invalid JSON syntax"

The tool validates JSON as you paste it. Common issues:
- Missing quotes around keys
- Trailing commas
- Unmatched braces

### Permission errors

If you see permission errors, check file/directory permissions:

```bash
chmod 644 ~/.mcpkit/mcp-servers.json
chmod 755 ~/.mcpkit
```

## Development

```bash
# Clone the repository
git clone https://github.com/tk-425/mcpkit-cli.git
cd mcpkit

# Install dependencies
npm install

# Build
npm run build

# Run locally
node dist/index.js

# Run tests
npm test

# Link for local testing
npm link
```

## License

ISC

## Contributing

Issues and pull requests are welcome!

## Links

- [Model Context Protocol Documentation](https://modelcontextprotocol.io)
- [GitHub Repository](https://github.com/tk-425/mcpkit-cli)
- [Report Issues](https://github.com/tk-425/mcpkit-cli/issues)
