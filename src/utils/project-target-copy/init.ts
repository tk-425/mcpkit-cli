import type { McpTarget } from "../targets.js";

export interface InitProjectTargetCopy {
  emptyRegistryMessage: string;
  emptyRegistryHint: string;
  mergePrompt: string;
  overwritePrompt: string;
  selectionMessage: string;
  cancelledMessage: string;
  noChangesMessage: string;
  selectedHeading: string;
  skippedServersHeading: string;
  successMessage(count: number): string;
}

const INIT_PROJECT_TARGET_COPY: Record<McpTarget, InitProjectTargetCopy> = {
  claude: {
    emptyRegistryMessage: "No Claude Code MCP servers in registry.",
    emptyRegistryHint:
      'Use "mcpkit registry add --claude" to add servers to your registry first.',
    mergePrompt: ".mcp.json already exists. Do you want to merge with existing servers?",
    overwritePrompt: "Overwrite existing .mcp.json?",
    selectionMessage: "Select Claude Code MCP servers for .mcp.json:",
    cancelledMessage: "Claude Code init cancelled.",
    noChangesMessage: "No Claude Code servers were added.",
    selectedHeading: "Selected Claude Code servers:",
    skippedServersHeading: "Skipped Claude Code servers:",
    successMessage: (count) =>
      `\n✓ Created .mcp.json with ${count} Claude server${count === 1 ? "" : "s"}`,
  },
  codex: {
    emptyRegistryMessage: "No Codex CLI MCP servers in registry.",
    emptyRegistryHint:
      'Use "mcpkit registry add --codex" to add servers to your registry first.',
    mergePrompt:
      ".codex/config.toml already exists. Do you want to merge with existing servers?",
    overwritePrompt: "Overwrite MCP server entries in .codex/config.toml?",
    selectionMessage: "Select Codex CLI MCP servers for .codex/config.toml:",
    cancelledMessage: "Codex CLI init cancelled.",
    noChangesMessage: "No Codex CLI servers were added.",
    selectedHeading: "Selected Codex CLI servers:",
    skippedServersHeading: "Skipped Codex CLI servers:",
    successMessage: (count) =>
      `\n✓ Updated .codex/config.toml with ${count} Codex server${count === 1 ? "" : "s"}`,
  },
  opencode: {
    emptyRegistryMessage: "No OpenCode CLI MCP servers in registry.",
    emptyRegistryHint:
      'Use "mcpkit registry add --opencode" to add servers to your registry first.',
    mergePrompt: "opencode.json already exists. Do you want to merge with existing servers?",
    overwritePrompt: "Overwrite MCP server entries in opencode.json?",
    selectionMessage: "Select OpenCode CLI MCP servers for opencode.json:",
    cancelledMessage: "OpenCode CLI init cancelled.",
    noChangesMessage: "No OpenCode CLI servers were added.",
    selectedHeading: "Selected OpenCode CLI servers:",
    skippedServersHeading: "Skipped OpenCode CLI servers:",
    successMessage: (count) =>
      `\n✓ Updated opencode.json with ${count} OpenCode server${count === 1 ? "" : "s"}`,
  },
};

export function getInitProjectTargetCopy(
  target: McpTarget,
): InitProjectTargetCopy {
  return INIT_PROJECT_TARGET_COPY[target];
}
