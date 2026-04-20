import { checkbox } from "@inquirer/prompts";
import chalk from "chalk";
import {
  getExplicitTargets,
  hasExplicitTargetSelection,
  type McpTarget,
  type TargetOptions,
} from "../utils/targets.js";

export async function promptProjectTargets(): Promise<McpTarget[]> {
  console.log(chalk.blue("\nSelect project target(s):"));
  console.log(
    chalk.gray(
      "(Use ↑/↓ to navigate, space to select/deselect, enter to confirm)\n",
    ),
  );

  const selectedTargets = await checkbox<McpTarget>({
    message: "Choose target platforms:",
    choices: [
      { name: "Claude Code", value: "claude", checked: false },
      { name: "Codex CLI", value: "codex", checked: false },
      { name: "OpenCode CLI", value: "opencode", checked: false },
    ],
    required: false,
  });

  if (selectedTargets.length === 0) {
    console.log(chalk.yellow("No targets selected. Cancelled."));
  }

  return selectedTargets;
}

export async function resolveProjectTargets(
  options: TargetOptions,
): Promise<McpTarget[]> {
  if (hasExplicitTargetSelection(options)) {
    return getExplicitTargets(options);
  }

  return promptProjectTargets();
}
