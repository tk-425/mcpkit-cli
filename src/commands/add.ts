import { checkbox } from "@inquirer/prompts";
import chalk from "chalk";
import {
  getAddProjectTargetCopy,
  getCommonProjectTargetCopy,
} from "../utils/project-target-copy/index.js";
import {
  getProjectTargetAdapter,
  sortCaseInsensitive,
  type ProjectTargetAdapter,
} from "../utils/project-target-adapter.js";
import type { McpTarget, TargetOptions } from "../utils/targets.js";
import { resolveProjectTargets } from "./project-targets.js";
import { reconcileProjectRuntimeArtifacts } from "../utils/project-runtime.js";

async function promptServerSelection(
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
    message: "Choose servers to add:",
    choices: serverNames.map((name) => ({
      name,
      value: name,
      checked: false,
    })),
    required: false,
  });
}

async function runAddFlow<TConfig, TRegistry, TServer>(
  adapter: ProjectTargetAdapter<TConfig, TRegistry, TServer>,
): Promise<void> {
  const commonCopy = getCommonProjectTargetCopy(adapter.key);
  const copy = getAddProjectTargetCopy(adapter.key);

  if (!adapter.configExists()) {
    console.error(chalk.red(commonCopy.missingConfigError));
    console.log(chalk.gray(commonCopy.missingConfigHint));
    return;
  }

  const projectConfig = await adapter.readConfig();
  const registry = await adapter.readRegistry();
  const projectServers = adapter.getProjectServers(projectConfig);
  const registryServers = adapter.getRegistryServers(registry);
  const availableServers = sortCaseInsensitive(
    Object.keys(registryServers).filter((name) => !(name in projectServers)),
  );

  if (availableServers.length === 0) {
    console.log(chalk.yellow(copy.noAvailableMessage));
    return;
  }

  const selectedServers = await promptServerSelection(
    availableServers,
    copy.selectionMessage,
  );

  if (selectedServers.length === 0) {
    console.log(chalk.yellow(copy.cancelledMessage));
    return;
  }

  const skippedServers: string[] = [];
  let addedCount = 0;

  for (const serverName of selectedServers) {
    const emitted = await adapter.emitProjectServer(
      serverName,
      registryServers[serverName],
    );
    if (emitted.skipped) {
      skippedServers.push(emitted.reason ?? `Skipped "${serverName}"`);
      continue;
    }

    projectServers[serverName] = emitted.config!;
    addedCount += 1;
  }

  if (addedCount === 0) {
    console.log(chalk.yellow(copy.noChangesMessage));
    skippedServers.forEach((message) => {
      console.log(chalk.yellow(`  • ${message}`));
    });
    return;
  }

  await adapter.writeConfig(projectConfig);
  await reconcileProjectRuntimeArtifacts();

  console.log(chalk.green(copy.successMessage(selectedServers.length)));
  if (skippedServers.length > 0) {
    console.log(chalk.yellow(`\n${copy.skippedServersHeading}`));
    skippedServers.forEach((message) => {
      console.log(chalk.yellow(`  • ${message}`));
    });
  }
}

async function runAddFlowForTarget(target: McpTarget): Promise<void> {
  await runAddFlow(getProjectTargetAdapter(target) as ProjectTargetAdapter<any, any, any>);
}

/**
 * Command handler for 'mcpkit add'
 */
export async function addCommand(options: TargetOptions): Promise<void> {
  try {
    const targets = await resolveProjectTargets(options);

    for (const target of targets) {
      await runAddFlowForTarget(target);
    }
  } catch (error) {
    throw error;
  }
}
