import { checkbox } from "@inquirer/prompts";
import chalk from "chalk";
import type { TargetOptions } from "../utils/targets.js";
import { resolveHookProjectTargets, type HookTarget } from "./hook-targets.js";
import { getProjectHookFileLabel, removeHookEntries } from "../utils/hook-apply.js";
import { readClaudeProjectHooks } from "../utils/claude-hooks.js";
import { readCodexProjectHooks } from "../utils/codex-hooks.js";
import { readAgyProjectHooks } from "../utils/agy-hooks.js";
import { readCursorProjectHooks } from "../utils/cursor-hooks.js";

async function readProjectEntryIds(target: HookTarget): Promise<string[]> {
  if (target === "claude") {
    return Object.keys(await readClaudeProjectHooks());
  }
  if (target === "codex") {
    return Object.keys(await readCodexProjectHooks());
  }
  if (target === "agy") {
    return Object.keys(await readAgyProjectHooks());
  }
  const file = await readCursorProjectHooks();
  return Object.keys(file.hooks ?? {});
}

/**
 * Command handler for 'mcpkit hooks remove'
 */
export async function hooksRemoveCommand(options: TargetOptions): Promise<void> {
  try {
    const targets = await resolveHookProjectTargets(
      options,
      "Choose platforms to remove hooks from:",
    );

    if (targets.length === 0) {
      console.log(chalk.yellow("No targets selected. Cancelled."));
      return;
    }

    for (const target of targets) {
      const fileLabel = getProjectHookFileLabel(target);
      const entryIds = await readProjectEntryIds(target);

      if (entryIds.length === 0) {
        console.log(chalk.yellow(`No hooks in the ${fileLabel} project file.`));
        continue;
      }

      const selectedIds = await checkbox<string>({
        message: `Choose hook entries to remove from ${fileLabel}:`,
        choices: entryIds.map((id) => ({ name: id, value: id, checked: false })),
        required: false,
      });

      if (selectedIds.length === 0) {
        console.log(chalk.yellow(`No hooks selected for ${fileLabel}. Skipped.`));
        continue;
      }

      const summary = await removeHookEntries(target, selectedIds);
      const removed = summary.entries.filter((entry) => entry.status === "removed");
      const notFound = summary.entries.filter((entry) => entry.status === "not-found");

      console.log(
        chalk.green(`✓ Removed ${removed.length} hook(s) from ${summary.fileLabel}`),
      );
      if (removed.length > 0) {
        console.log(chalk.gray(`  removed: ${removed.map((entry) => entry.id).join(", ")}`));
      }
      if (notFound.length > 0) {
        console.log(
          chalk.yellow(`  not found: ${notFound.map((entry) => entry.id).join(", ")}`),
        );
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