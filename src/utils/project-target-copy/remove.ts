import type { McpTarget } from "../targets.js";

export interface RemoveProjectTargetCopy {
  selectionMessage: string;
  emptyMessage: string;
  cancelledMessage: string;
  confirmMessage(count: number): string;
  successMessage(name: string): string;
}

const REMOVE_PROJECT_TARGET_COPY: Record<McpTarget, RemoveProjectTargetCopy> = {
  claude: {
    selectionMessage: "Select Claude Code MCP servers to remove from .mcp.json:",
    emptyMessage: "No Claude Code MCP servers found in .mcp.json",
    cancelledMessage: "Claude Code removal cancelled.",
    confirmMessage: (count) => `Remove ${count} Claude server(s) from .mcp.json?`,
    successMessage: (name) => `✓ Removed "${name}" from .mcp.json`,
  },
  codex: {
    selectionMessage:
      "Select Codex CLI MCP servers to remove from .codex/config.toml:",
    emptyMessage: "No Codex CLI MCP servers found in .codex/config.toml",
    cancelledMessage: "Codex CLI removal cancelled.",
    confirmMessage: (count) =>
      `Remove ${count} Codex server(s) from .codex/config.toml?`,
    successMessage: (name) => `✓ Removed "${name}" from .codex/config.toml`,
  },
};

export function getRemoveProjectTargetCopy(
  target: McpTarget,
): RemoveProjectTargetCopy {
  return REMOVE_PROJECT_TARGET_COPY[target];
}
