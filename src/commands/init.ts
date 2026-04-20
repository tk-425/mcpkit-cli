import { checkbox, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import {
  getAddProjectTargetCopy,
  getInitProjectTargetCopy,
} from "../utils/project-target-copy/index.js";
import {
  getProjectTargetAdapter,
  sortCaseInsensitive,
  type ProjectTargetAdapter,
} from "../utils/project-target-adapter.js";
import type {
  McpTarget,
  TargetOptions,
} from "../utils/targets.js";
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
    message: "Choose servers:",
    choices: serverNames.map((name) => ({
      name,
      value: name,
      checked: false,
    })),
    required: false,
  });
}

async function runInitFlow<TConfig, TRegistry, TServer>(
  adapter: ProjectTargetAdapter<TConfig, TRegistry, TServer>,
): Promise<void> {
  const copy = getInitProjectTargetCopy(adapter.key);
  const addCopy = getAddProjectTargetCopy(adapter.key);
  const registry = await adapter.readRegistry();
  const registryServers = adapter.getRegistryServers(registry);
  const serverNames = sortCaseInsensitive(Object.keys(registryServers));

  if (serverNames.length === 0) {
    console.log(chalk.yellow(copy.emptyRegistryMessage));
    console.log(chalk.gray(copy.emptyRegistryHint));
    return;
  }

  const configExists = adapter.configExists();
  let shouldMerge = false;

  if (configExists) {
    const action = await confirm({
      message: copy.mergePrompt,
      default: true,
    });

    if (action) {
      shouldMerge = true;
    } else {
      const shouldOverwrite = await confirm({
        message: copy.overwritePrompt,
        default: false,
      });

      if (!shouldOverwrite) {
        console.log(chalk.yellow(copy.cancelledMessage));
        return;
      }
    }
  }

  const selectedServers = await promptServerSelection(
    serverNames,
    copy.selectionMessage,
  );

  if (selectedServers.length === 0) {
    console.log(chalk.yellow(addCopy.cancelledMessage));
    return;
  }

  const projectConfig = configExists
    ? shouldMerge
      ? await adapter.readConfig()
      : await adapter.readConfigOrDefault()
    : adapter.createEmptyConfig();

  if (configExists && !shouldMerge) {
    adapter.resetServers(projectConfig);
  }

  const projectServers = adapter.getProjectServers(projectConfig);
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
  console.log(chalk.gray(copy.selectedHeading));
  selectedServers.forEach((name) => {
    console.log(chalk.gray(`  • ${name}`));
  });
  if (skippedServers.length > 0) {
    console.log(chalk.yellow(`\n${copy.skippedServersHeading}`));
    skippedServers.forEach((message) => {
      console.log(chalk.yellow(`  • ${message}`));
    });
  }
}

async function runInitFlowForTarget(target: McpTarget): Promise<void> {
  await runInitFlow(getProjectTargetAdapter(target) as ProjectTargetAdapter<any, any, any>);
}

/**
 * Command handler for 'mcpkit init'
 */
export async function initCommand(options: TargetOptions): Promise<void> {
  try {
    const targets = await resolveProjectTargets(options);

    for (const target of targets) {
      await runInitFlowForTarget(target);
    }
  } catch (error) {
    throw error;
  }
}
