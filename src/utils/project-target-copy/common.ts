import type { McpTarget } from "../targets.js";

export interface CommonProjectTargetCopy {
  missingConfigError: string;
  missingConfigHint: string;
}

const COMMON_PROJECT_TARGET_COPY: Record<McpTarget, CommonProjectTargetCopy> = {
  claude: {
    missingConfigError: "Error: .mcp.json not found in current directory",
    missingConfigHint: 'Use "mcpkit init --claude" or "mcpkit init" to create it first',
  },
  codex: {
    missingConfigError: "Error: .codex/config.toml not found in current directory",
    missingConfigHint: 'Use "mcpkit init --codex" or "mcpkit init" to create it first',
  },
};

export function getCommonProjectTargetCopy(
  target: McpTarget,
): CommonProjectTargetCopy {
  return COMMON_PROJECT_TARGET_COPY[target];
}
