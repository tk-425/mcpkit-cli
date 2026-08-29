import { checkbox } from "@inquirer/prompts";
import chalk from "chalk";
import type { TargetOptions } from "../utils/targets.js";
import { resolveHookProjectTargets, type HookTarget } from "./hook-targets.js";
import { applyHookEntries, getProjectHookFileLabel } from "../utils/hook-apply.js";
import { getClaudeHookRegistryEntryIds, readClaudeHookRegistry } from "../utils/claude-hooks.js";
import { getCodexHookRegistryEntryIds, readCodexHookRegistry } from "../utils/codex-hooks.js";
import { getAgyHookRegistryEntryIds, readAgyHookRegistry } from "../utils/agy-hooks.js";
import { getCursorHookRegistryEntryIds, readCursorHookRegistry } from "../utils/cursor-hooks.js";

const PLATFORM_NAMES: Record<HookTarget, string> = {
  claude: "Claude",
  codex: "Codex",
  agy: "Antigravity",
  cursor: "Cursor",
};

async function readRegistryEntryIds(target: HookTarget): Promise<string[]> {
  if (target === "claude") {
    return getClaudeHookRegistryEntryIds(await readClaudeHookRegistry());
  }
  if (target === "codex") {
    return getCodexHookRegistryEntryIds(await readCodexHookRegistry());
  }
  if (target === "agy") {
    return getAgyHookRegistryEntryIds(await readAgyHookRegistry());
  }
  return getCursorHookRegistryEntryIds(await readCursorHookRegistry());
}

/**
 * Command handler for 'mcpkit hooks apply'
 */
export async function hooksApplyCommand(options: TargetOptions): Promise<void> {
  try {
    const targets = await resolveHookProjectTargets(
      options,
      "Choose platforms to apply hooks to:",
    );

    if (targets.length === 0) {
      console.log(chalk.yellow("No targets selected. Cancelled."));
      return;
    }

    for (const target of targets) {
      const entryIds = await readRegistryEntryIds(target);

      if (entryIds.length === 0) {
        console.log(
          chalk.yellow(`No saved hooks for ${PLATFORM_NAMES[target]}. Add one with \`mcpkit hooks add\`.`),
        );
        continue;
      }

      const fileLabel = getProjectHookFileLabel(target);
      const selectedIds = await checkbox<string>({
        message: `Choose hook entries to apply to ${fileLabel}:`,
        choices: entryIds.map((id) => ({ name: id, value: id, checked: false })),
        required: false,
      });

      if (selectedIds.length === 0) {
        console.log(chalk.yellow(`No hooks selected for ${fileLabel}. Skipped.`));
        continue;
      }

      const summary = await applyHookEntries(target, selectedIds);
      const added = summary.entries.filter((entry) => entry.status === "added");
      const refreshed = summary.entries.filter((entry) => entry.status === "refreshed");

      console.log(
        chalk.green(`✓ Applied ${summary.entries.length} hook(s) to ${summary.fileLabel}`),
      );
      if (added.length > 0) {
        console.log(chalk.gray(`  added: ${added.map((entry) => entry.id).join(", ")}`));
      }
      if (refreshed.length > 0) {
        console.log(chalk.gray(`  refreshed: ${refreshed.map((entry) => entry.id).join(", ")}`));
      }
      console.log(chalk.gray("  The hook registry was not modified."));
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("User force closed the prompt with SIGINT")
    ) {
      throw error;
    }

    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}