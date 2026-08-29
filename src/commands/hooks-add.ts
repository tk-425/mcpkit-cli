import { editor } from "@inquirer/prompts";
import chalk from "chalk";
import type { TargetOptions } from "../utils/targets.js";
import { resolveHookSingleTarget, type HookTarget } from "./hook-targets.js";
import {
  parseAgyHookEntry,
  parseClaudeHookEntry,
  parseCodexHookEntry,
  parseCursorHookEntry,
  validateAgyHookEntry,
  validateClaudeHookEntry,
  validateClaudeMcpToolServerRefs,
  validateCodexHookEntry,
  validateCodexMcpToolServerRefs,
  validateCursorHookEntry,
} from "../utils/hook-validation.js";
import { addHookEntryToClaudeRegistry } from "../utils/claude-hooks.js";
import { addHookEntryToCodexRegistry } from "../utils/codex-hooks.js";
import { addHookEntryToAgyRegistry } from "../utils/agy-hooks.js";
import { addHookEntryToCursorRegistry, type CursorHookHandler } from "../utils/cursor-hooks.js";

const REGISTRY_LABELS: Record<HookTarget, string> = {
  claude: "Claude hook registry (~/.mcpkit/claude-hooks.json)",
  codex: "Codex hook registry (~/.mcpkit/codex-hooks.toml)",
  agy: "Antigravity hook registry (~/.mcpkit/agy-hooks.json)",
  cursor: "Cursor hook registry (~/.mcpkit/cursor-hooks.json)",
};

function printExample(target: HookTarget): void {
  if (target === "claude") {
    console.log(chalk.gray('  "PostToolUse": ['));
    console.log(chalk.gray('    { "matcher": "npx", "hooks": ['));
    console.log(chalk.gray('      { "type": "command", "command": "echo hooked" }'));
    console.log(chalk.gray("    ] }"));
    console.log(chalk.gray("  ]"));
  } else if (target === "codex") {
    console.log(chalk.gray("  [[hooks.PostToolUse]]"));
    console.log(chalk.gray('  matcher = "npx"'));
    console.log(chalk.gray("  [[hooks.PostToolUse.hooks]]"));
    console.log(chalk.gray('  type = "command"'));
    console.log(chalk.gray('  command = "echo hooked"'));
  } else if (target === "agy") {
    console.log(chalk.gray('  "my-linter-hook": {'));
    console.log(chalk.gray('    "enabled": true,'));
    console.log(chalk.gray('    "PostToolUse": ['));
    console.log(chalk.gray('      { "matcher": "run_command", "hooks": ['));
    console.log(chalk.gray('        { "type": "command", "command": "./scripts/lint.sh" }'));
    console.log(chalk.gray("      ] }"));
    console.log(chalk.gray("    ]"));
    console.log(chalk.gray("  }"));
  } else {
    console.log(chalk.gray('  "postToolUse": ['));
    console.log(chalk.gray('    { "command": "echo hooked", "matcher": "npx", "timeout": 30 }'));
    console.log(chalk.gray("  ]"));
  }
}

function validatePastedEntry(target: HookTarget, value: string): boolean | string {
  try {
    if (target === "claude") {
      validateClaudeHookEntry(parseClaudeHookEntry(value));
    } else if (target === "codex") {
      validateCodexHookEntry(parseCodexHookEntry(value));
    } else if (target === "agy") {
      validateAgyHookEntry(parseAgyHookEntry(value));
    } else {
      validateCursorHookEntry(parseCursorHookEntry(value));
    }
    return true;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid hook entry";
  }
}

/**
 * Command handler for 'mcpkit hooks add'
 */
export async function hooksAddCommand(options: TargetOptions): Promise<void> {
  try {
    const target = await resolveHookSingleTarget(
      options,
      "Choose a platform to add a hook to:",
    );

    if (!target) {
      console.log(chalk.yellow("No target selected. Cancelled."));
      return;
    }

    console.log(chalk.blue("Opening editor for hook entry..."));
    console.log();
    console.log(chalk.gray("Instructions:"));
    console.log(chalk.gray("  1. Paste one native hook entry for this platform"));
    console.log(chalk.gray("  2. Save and exit (vim: :wq | nano: Ctrl+O then Ctrl+X)"));
    console.log();
    console.log(chalk.gray("Example format:"));

    printExample(target);

    console.log();

    const pastedInput = await editor({
      message: `Enter ${target === "claude" ? "Claude" : target === "codex" ? "Codex" : target === "agy" ? "Antigravity" : "Cursor"} hook entry (paste and save):`,
      default: "",
      validate: (value) => validatePastedEntry(target, value),
    });

    if (target === "claude") {
      const entry = parseClaudeHookEntry(pastedInput);
      validateClaudeHookEntry(entry);
      await validateClaudeMcpToolServerRefs(entry);
      await addHookEntryToClaudeRegistry(entry.entryId, entry.matcherGroups);
      console.log(chalk.green(`✓ Added "${entry.entryId}" to ${REGISTRY_LABELS.claude}`));
      return;
    }

    if (target === "codex") {
      const entry = parseCodexHookEntry(pastedInput);
      validateCodexHookEntry(entry);
      await validateCodexMcpToolServerRefs(entry);
      await addHookEntryToCodexRegistry(entry.entryId, entry.matcherGroups);
      console.log(chalk.green(`✓ Added "${entry.entryId}" to ${REGISTRY_LABELS.codex}`));
      return;
    }

    if (target === "agy") {
      const entry = parseAgyHookEntry(pastedInput);
      validateAgyHookEntry(entry);
      await addHookEntryToAgyRegistry(entry.entryId, entry.group);
      console.log(chalk.green(`✓ Added "${entry.entryId}" to ${REGISTRY_LABELS.agy}`));
      return;
    }

    const entry = parseCursorHookEntry(pastedInput);
    validateCursorHookEntry(entry);
    await addHookEntryToCursorRegistry(entry.entryId, entry.handlers as CursorHookHandler[]);
    console.log(chalk.green(`✓ Added "${entry.entryId}" to ${REGISTRY_LABELS.cursor}`));
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