import type { McpTarget } from "../targets.js";

export interface AddProjectTargetCopy {
  selectionMessage: string;
  cancelledMessage: string;
  noAvailableMessage: string;
  noChangesMessage: string;
  skippedServersHeading: string;
  successMessage(count: number): string;
}

const ADD_PROJECT_TARGET_COPY: Record<McpTarget, AddProjectTargetCopy> = {
  claude: {
    selectionMessage: "Select Claude Code MCP servers to add to .mcp.json:",
    cancelledMessage: "No Claude Code servers selected. Cancelled.",
    noAvailableMessage: "No new Claude Code servers available to add.",
    noChangesMessage: "No Claude Code servers were added.",
    skippedServersHeading: "Skipped Claude Code servers:",
    successMessage: (count) =>
      `\n✓ Added ${count} Claude server${count === 1 ? "" : "s"} to .mcp.json`,
  },
  codex: {
    selectionMessage: "Select Codex CLI MCP servers to add to .codex/config.toml:",
    cancelledMessage: "No Codex CLI servers selected. Cancelled.",
    noAvailableMessage: "No new Codex CLI servers available to add.",
    noChangesMessage: "No Codex CLI servers were added.",
    skippedServersHeading: "Skipped Codex CLI servers:",
    successMessage: (count) =>
      `\n✓ Added ${count} Codex server${count === 1 ? "" : "s"} to .codex/config.toml`,
  },
  opencode: {
    selectionMessage: "Select OpenCode CLI MCP servers to add to opencode.json:",
    cancelledMessage: "No OpenCode CLI servers selected. Cancelled.",
    noAvailableMessage: "No new OpenCode CLI servers available to add.",
    noChangesMessage: "No OpenCode CLI servers were added.",
    skippedServersHeading: "Skipped OpenCode CLI servers:",
    successMessage: (count) =>
      `\n✓ Added ${count} OpenCode server${count === 1 ? "" : "s"} to opencode.json`,
  },
};

export function getAddProjectTargetCopy(target: McpTarget): AddProjectTargetCopy {
  return ADD_PROJECT_TARGET_COPY[target];
}
