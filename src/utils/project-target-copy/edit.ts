import type { McpTarget } from "../targets.js";

export interface EditProjectTargetCopy {
  selectionMessage: string;
  emptyMessage: string;
  inputMessage: string;
  instruction: string;
  successMessage(name: string): string;
}

const EDIT_PROJECT_TARGET_COPY: Record<McpTarget, EditProjectTargetCopy> = {
  claude: {
    selectionMessage: "Choose a Claude Code server to edit:",
    emptyMessage: "No Claude Code MCP servers found in .mcp.json",
    inputMessage: "Edit server configuration (save and exit to confirm):",
    instruction: "  1. Edit the JSON configuration",
    successMessage: (name) => `✓ Updated "${name}" in .mcp.json`,
  },
  codex: {
    selectionMessage: "Choose a Codex CLI server to edit:",
    emptyMessage: "No Codex CLI MCP servers found in .codex/config.toml",
    inputMessage: "Edit Codex server configuration (save and exit to confirm):",
    instruction: "  1. Edit the TOML configuration",
    successMessage: (name) => `✓ Updated "${name}" in .codex/config.toml`,
  },
};

export function getEditProjectTargetCopy(
  target: McpTarget,
): EditProjectTargetCopy {
  return EDIT_PROJECT_TARGET_COPY[target];
}
