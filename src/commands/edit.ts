import { editor, select } from "@inquirer/prompts";
import chalk from "chalk";
import {
  getCommonProjectTargetCopy,
  getEditProjectTargetCopy,
} from "../utils/project-target-copy/index.js";
import type { McpTarget, TargetOptions } from "../utils/targets.js";
import {
  getProjectTargetAdapter,
  sortCaseInsensitive,
  type ProjectTargetAdapter,
} from "../utils/project-target-adapter.js";
import { resolveSingleTarget } from "./single-target.js";

async function runEditFlow<TConfig, TRegistry, TServer>(
  adapter: ProjectTargetAdapter<TConfig, TRegistry, TServer>,
): Promise<void> {
  const commonCopy = getCommonProjectTargetCopy(adapter.key);
  const copy = getEditProjectTargetCopy(adapter.key);
  if (!adapter.configExists()) {
    console.error(chalk.red(commonCopy.missingConfigError));
    console.log(chalk.gray(commonCopy.missingConfigHint));
    return;
  }

  const config = await adapter.readConfig();
  const servers = adapter.getProjectServers(config);
  const serverNames = sortCaseInsensitive(Object.keys(servers));

  if (serverNames.length === 0) {
    console.log(chalk.yellow(copy.emptyMessage));
    return;
  }

  const selectedName = await select({
    message: copy.selectionMessage,
    choices: serverNames.map((name) => ({ name, value: name })),
  });

  const defaultValue = adapter.serializeServerForEdit(
    selectedName,
    servers[selectedName],
  );

  console.log(chalk.blue("Opening editor for MCP server configuration..."));
  console.log();
  console.log(chalk.gray("Instructions:"));
  console.log(chalk.gray(copy.instruction));
  console.log(
    chalk.gray("  2. Save and exit (vim: :wq | nano: Ctrl+O then Ctrl+X)"),
  );
  console.log();

  const pastedInput = await editor({
    message: copy.inputMessage,
    default: defaultValue,
    validate: (value) => {
      if (!value.trim()) {
        return "Please provide a server configuration";
      }
      try {
        adapter.parseEditedServerInput(value);
        return true;
      } catch (error) {
        return error instanceof Error ? error.message : "Invalid configuration";
      }
    },
  });

  const { name, config: updatedConfig } = adapter.parseEditedServerInput(pastedInput);
  await adapter.addServer(name, updatedConfig);
  console.log(chalk.green(copy.successMessage(name)));
}

async function runEditFlowForTarget(target: McpTarget): Promise<void> {
  if (target === "claude") {
    await runEditFlow(getProjectTargetAdapter("claude"));
    return;
  }

  await runEditFlow(getProjectTargetAdapter("codex"));
}

/**
 * Command handler for 'mcpkit edit'
 */
export async function editCommand(options: TargetOptions): Promise<void> {
  try {
    const target = await resolveSingleTarget(options, "Choose project target:");

    if (!target) {
      console.log(chalk.yellow("No target selected. Cancelled."));
      return;
    }

    await runEditFlowForTarget(target);
  } catch (error) {
    throw error;
  }
}
