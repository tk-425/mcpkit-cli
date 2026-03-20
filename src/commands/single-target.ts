import { select } from "@inquirer/prompts";
import {
  getExplicitTargets,
  hasExplicitTargetSelection,
  type McpTarget,
  type TargetOptions,
} from "../utils/targets.js";

export async function resolveSingleTarget(
  options: TargetOptions,
  promptMessage: string,
): Promise<McpTarget | null> {
  const explicitTargets = getExplicitTargets(options);

  if (explicitTargets.length > 1) {
    throw new Error("Choose only one target for this command.");
  }

  if (explicitTargets.length === 1) {
    return explicitTargets[0];
  }

  if (hasExplicitTargetSelection(options)) {
    return null;
  }

  return select<McpTarget>({
    message: promptMessage,
    choices: [
      { name: "Claude Code", value: "claude" },
      { name: "Codex CLI", value: "codex" },
    ],
  });
}
