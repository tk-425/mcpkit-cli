import chalk from "chalk";
import {
  getCommonProjectTargetCopy,
  getUpdateProjectTargetCopy,
} from "../utils/project-target-copy/index.js";
import {
  getProjectTargetAdapter,
  PROJECT_TARGET_ADAPTERS,
  type ProjectTargetAdapter,
} from "../utils/project-target-adapter.js";
import {
  reconcileProjectRuntimeArtifacts,
} from "../utils/project-runtime.js";
import type { TargetOptions, McpTarget } from "../utils/targets.js";
import { getExplicitTargets } from "../utils/targets.js";

type UpdateOutcome =
  | { kind: "refreshed_direct"; serverName: string }
  | { kind: "refreshed_wrapper"; serverName: string }
  | { kind: "preserved_missing_registry"; serverName: string }
  | { kind: "preserved_skipped"; serverName: string; reason: string };

function printNoProjectConfigMessage(): void {
  console.log(
    chalk.yellow(
      'No project MCP config found in the current directory. Run "mcpkit init" first.',
    ),
  );
}

function printMissingTargetConfigMessage(target: "claude" | "codex"): void {
  const adapter = getProjectTargetAdapter(target);
  const copy = getCommonProjectTargetCopy(target);
  console.log(chalk.yellow(`No ${adapter.configPath} found in the current directory.`));
  console.log(chalk.gray(`${copy.missingConfigHint}.`));
}

function getDetectedTargets(): McpTarget[] {
  return PROJECT_TARGET_ADAPTERS.filter((adapter) => adapter.configExists()).map(
    (adapter) => adapter.key,
  );
}

function formatOutcomeMessage(outcome: UpdateOutcome): string {
  switch (outcome.kind) {
    case "refreshed_direct":
      return `Refreshed "${outcome.serverName}" directly from the registry.`;
    case "refreshed_wrapper":
      return `Refreshed "${outcome.serverName}" with a project-local wrapper.`;
    case "preserved_missing_registry":
      return `Preserved "${outcome.serverName}": not found in the registry.`;
    case "preserved_skipped":
      return `Preserved "${outcome.serverName}": ${outcome.reason}`;
  }
}

function printTargetSummary(
  targetLabel: string,
  outcomes: UpdateOutcome[],
  configPath: string,
): void {
  const refreshed = outcomes.filter(
    (outcome) =>
      outcome.kind === "refreshed_direct" || outcome.kind === "refreshed_wrapper",
  );
  const warnings = outcomes.filter(
    (outcome) =>
      outcome.kind === "preserved_missing_registry" ||
      outcome.kind === "preserved_skipped",
  );

  if (refreshed.length > 0) {
    console.log(
      chalk.green(
        `\n✓ Updated ${configPath} with ${refreshed.length} refreshed ${targetLabel} server${refreshed.length === 1 ? "" : "s"}`,
      ),
    );
    refreshed.forEach((outcome) => {
      console.log(chalk.gray(`  • ${formatOutcomeMessage(outcome)}`));
    });
  } else {
    console.log(chalk.yellow(`No ${targetLabel} servers were refreshed.`));
  }

  if (warnings.length > 0) {
    console.log(chalk.yellow(`\nPreserved ${targetLabel} project entries:`));
    warnings.forEach((outcome) => {
      console.log(chalk.yellow(`  • ${formatOutcomeMessage(outcome)}`));
    });
  }
}

async function runUpdateFlow<TConfig, TRegistry, TServer>(
  adapter: ProjectTargetAdapter<TConfig, TRegistry, TServer>,
): Promise<void> {
  const copy = getUpdateProjectTargetCopy(adapter.key);
  const projectConfig = await adapter.readConfig();
  const registry = await adapter.readRegistry();
  const projectServers = adapter.getProjectServers(projectConfig);
  const registryServers = adapter.getRegistryServers(registry);
  const outcomes: UpdateOutcome[] = [];

  for (const serverName of Object.keys(projectServers)) {
    const registryEntry = registryServers[serverName];

    if (!registryEntry) {
      outcomes.push({ kind: "preserved_missing_registry", serverName });
      continue;
    }

    const emitted = await adapter.emitProjectServer(serverName, registryEntry);

    if (emitted.skipped) {
      outcomes.push({
        kind: "preserved_skipped",
        serverName,
        reason: emitted.reason ?? "could not be refreshed safely",
      });
      continue;
    }

    projectServers[serverName] = emitted.config!;
    outcomes.push({
      kind: emitted.usedWrapper ? "refreshed_wrapper" : "refreshed_direct",
      serverName,
    });
  }

  await adapter.writeConfig(projectConfig);
  printTargetSummary(copy.summaryLabel, outcomes, adapter.configPath);
}

async function runUpdateFlowForTarget(target: McpTarget): Promise<void> {
  if (target === "claude") {
    await runUpdateFlow(getProjectTargetAdapter("claude"));
    return;
  }

  await runUpdateFlow(getProjectTargetAdapter("codex"));
}

/**
 * Command handler for 'mcpkit refresh'
 */
export async function refreshCommand(options: TargetOptions): Promise<void> {
  const requestedTargets = getExplicitTargets(options);

  if (requestedTargets.length === 0) {
    const detectedTargets = getDetectedTargets();

    if (detectedTargets.length === 0) {
      printNoProjectConfigMessage();
      return;
    }

    for (const target of detectedTargets) {
      await runUpdateFlowForTarget(target);
    }

    await reconcileProjectRuntimeArtifacts();
    return;
  }

  let ranAnyTarget = false;

  for (const target of requestedTargets) {
    if (!getProjectTargetAdapter(target).configExists()) {
      printMissingTargetConfigMessage(target);
      continue;
    }

    await runUpdateFlowForTarget(target);
    ranAnyTarget = true;
  }

  if (!ranAnyTarget) {
    return;
  }

  await reconcileProjectRuntimeArtifacts();
}
