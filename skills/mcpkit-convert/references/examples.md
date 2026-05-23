# Examples

This reference collects representative one-server conversion examples. Use these to check output shape and warning behavior before returning final Registry input.

## Command-Based Server

Source supported agent: Codex CLI

Source Registry input:

```toml
[mcp_servers.my-api-server]
command = "npx"
args = ["-y", "@example/my-api-mcp"]

[mcp_servers.my-api-server.env]
API_KEY = "${API_KEY}"
```

Target: Claude Code

```json
"my-api-server": {
  "command": "npx",
  "args": ["-y", "@example/my-api-mcp"],
  "env": {
    "API_KEY": "${API_KEY}"
  }
}
```

Manual command:

```bash
mcpkit registry add --claude
```

Target: OpenCode CLI

```json
"my-api-server": {
  "type": "local",
  "command": ["npx", "-y", "@example/my-api-mcp"],
  "environment": {
    "API_KEY": "{env:API_KEY}"
  }
}
```

Manual command:

```bash
mcpkit registry add --opencode
```

Target: Gemini CLI

```json
"my-api-server": {
  "command": "npx",
  "args": ["-y", "@example/my-api-mcp"],
  "env": {
    "API_KEY": "${API_KEY}"
  }
}
```

Manual command:

```bash
mcpkit registry add --gemini
```

Target: Cursor

```json
"my-api-server": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@example/my-api-mcp"],
  "env": {
    "API_KEY": "${env:API_KEY}"
  }
}
```

Manual command:

```bash
mcpkit registry add --cursor
```

Expected warning: none for these target snippets.

## URL-Based Server

Source supported agent: Claude Code

Source Registry input:

```json
"context7": {
  "url": "https://mcp.context7.com/mcp"
}
```

Target: Codex CLI

```toml
[mcp_servers.context7]
url = "https://mcp.context7.com/mcp"
```

Manual command:

```bash
mcpkit registry add --codex
```

Target: OpenCode CLI

```json
"context7": {
  "type": "remote",
  "url": "https://mcp.context7.com/mcp"
}
```

Manual command:

```bash
mcpkit registry add --opencode
```

Target: Gemini CLI

```json
"context7": {
  "url": "https://mcp.context7.com/mcp"
}
```

Manual command:

```bash
mcpkit registry add --gemini
```

Target: Cursor

```json
"context7": {
  "url": "https://mcp.context7.com/mcp"
}
```

Manual command:

```bash
mcpkit registry add --cursor
```

Expected warning: none for these target snippets.

## Warning Case: Unsupported Target-Specific Fields

Source supported agent: Cursor

Source Registry input:

```json
"oauth-server": {
  "url": "https://api.example.com/mcp",
  "auth": {
    "CLIENT_ID": "${env:CLIENT_ID}",
    "CLIENT_SECRET": "${env:CLIENT_SECRET}",
    "scopes": ["read"]
  }
}
```

Target: Claude Code

```json
"oauth-server": {
  "url": "https://api.example.com/mcp"
}
```

Expected warning:

```text
Warning: Cursor auth has no documented Claude Code Registry input equivalent. It was not rendered.
```

Manual command:

```bash
mcpkit registry add --claude
```

## Warning Case: Remote Auth Shape

Source supported agent: Codex CLI

Source Registry input:

```toml
[mcp_servers.secure-remote]
url = "https://api.example.com/mcp"
bearer_token_env_var = "API_KEY"
```

Target: Cursor

```json
"secure-remote": {
  "url": "https://api.example.com/mcp"
}
```

Expected warning:

```text
Warning: Codex bearer_token_env_var has no safe Cursor Registry input equivalent. The URL was rendered without auth.
```

Manual command:

```bash
mcpkit registry add --cursor
```

## Stop Case: Multi-Server Input

Source supported agent: Claude Code

Source input:

```json
{
  "one": {
    "command": "npx",
    "args": ["pkg-one"]
  },
  "two": {
    "command": "npx",
    "args": ["pkg-two"]
  }
}
```

Expected result:

```text
Stop: input contains multiple MCP server entries. Ask the user to provide exactly one MCP server entry.
```

Do not render target snippets.
