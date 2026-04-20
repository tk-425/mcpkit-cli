import type { McpTarget } from "../targets.js";

export interface UpdateProjectTargetCopy {
  summaryLabel: string;
}

const UPDATE_PROJECT_TARGET_COPY: Record<McpTarget, UpdateProjectTargetCopy> = {
  claude: {
    summaryLabel: "Claude Code",
  },
  codex: {
    summaryLabel: "Codex CLI",
  },
  opencode: {
    summaryLabel: "OpenCode CLI",
  },
};

export function getUpdateProjectTargetCopy(
  target: McpTarget,
): UpdateProjectTargetCopy {
  return UPDATE_PROJECT_TARGET_COPY[target];
}
