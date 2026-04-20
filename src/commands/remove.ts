import { checkbox, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import {
  getCommonProjectTargetCopy,
  getRemoveProjectTargetCopy,
} from "../utils/project-target-copy/index.js";
import {
  getProjectTargetAdapter,
  sortCaseInsensitive,
  type ProjectTargetAdapter,
} from "../utils/project-target-adapter.js";
import type { McpTarget, TargetOptions } from "../utils/targets.js";
import { resolveProjectTargets } from "./project-targets.js";
import {
  reconcileProjectRuntime,
} from "../utils/project-runtime.js";

async function promptServerRemoval(
  serverNames: string[],
  message: string,
): Promise<string[]> {
  console.log(chalk.blue(`\n${message}`));
  console.log(
    chalk.gray(
      "(Use ↑/↓ to navigate, space to select/deselect, enter to confirm)\n",
    ),
  );

  return checkbox({
    message: "Choose servers to remove:",
    choices: serverNames.map((name) => ({
      name,
      value: name,
      checked: false,
    })),
    required: false,
  });
}

async function runRemoveFlow<TConfig, TRegistry, TServer>(
  adapter: ProjectTargetAdapter<TConfig, TRegistry, TServer>,
): Promise<void> {
  const commonCopy = getCommonProjectTargetCopy(adapter.key);
  const copy = getRemoveProjectTargetCopy(adapter.key);
  if (!adapter.configExists()) {
    console.error(chalk.red(commonCopy.missingConfigError));
    console.log(chalk.gray(commonCopy.missingConfigHint));
    return;
  }

  const config = await adapter.readConfig();
  const projectServers = adapter.getProjectServers(config);
  const serverNames = sortCaseInsensitive(Object.keys(projectServers));

  if (serverNames.length === 0) {
    console.log(chalk.yellow(copy.emptyMessage));
    return;
  }

  const serversToRemove = await promptServerRemoval(
    serverNames,
    copy.selectionMessage,
  );

  if (serversToRemove.length === 0) {
    console.log(chalk.yellow("No servers selected for removal."));
    return;
  }

  const confirmed = await confirm({
    message: copy.confirmMessage(serversToRemove.length),
    default: false,
  });

  if (!confirmed) {
    console.log(chalk.yellow(copy.cancelledMessage));
    return;
  }

  for (const serverName of serversToRemove) {
    await adapter.removeServer(serverName);

    console.log(chalk.green(copy.successMessage(serverName)));
  }

  await reconcileProjectRuntime();
}

async function runRemoveFlowForTarget(target: McpTarget): Promise<void> {
  await runRemoveFlow(getProjectTargetAdapter(target) as ProjectTargetAdapter<any, any, any>);
}

/**
 * Command handler for 'mcpkit remove'
 */
export async function removeCommand(options: TargetOptions): Promise<void> {
  try {
    const targets = await resolveProjectTargets(options);

    for (const target of targets) {
      await runRemoveFlowForTarget(target);
    }
  } catch (error) {
    throw error;
  }
}
