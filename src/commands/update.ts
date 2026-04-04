import chalk from "chalk";
import {
  codexProjectConfigExists,
  ensureCodexMcpServers,
  readCodexProjectConfig,
  readCodexRegistry,
  writeCodexProjectConfig,
} from "../utils/codex-config.js";
import { ensureMcpkitGitignoreBlock } from "../utils/gitignore.js";
import {
  emitClaudeProjectServer,
  emitCodexProjectServer,
} from "../utils/project-emitter.js";
import { collectReferencedWrapperPaths } from "../utils/project-runtime.js";
import {
  projectConfigExists,
  readProjectConfig,
  writeProjectConfig,
} from "../utils/project-config.js";
import { readRegistry } from "../utils/registry.js";
import type { TargetOptions } from "../utils/targets.js";

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
  if (target === "claude") {
    console.log(chalk.yellow('No .mcp.json found in the current directory.'));
    console.log(
      chalk.gray('Use "mcpkit init --claude" or "mcpkit init" to create it first.'),
    );
    return;
  }

  console.log(chalk.yellow("No .codex/config.toml found in the current directory."));
  console.log(
    chalk.gray('Use "mcpkit init --codex" or "mcpkit init" to create it first.'),
  );
}

function getRequestedTargets(options: TargetOptions): Array<"claude" | "codex"> {
  const targets: Array<"claude" | "codex"> = [];

  if (options.claude) {
    targets.push("claude");
  }

  if (options.codex) {
    targets.push("codex");
  }

  return targets;
}

function getDetectedTargets(): Array<"claude" | "codex"> {
  const targets: Array<"claude" | "codex"> = [];

  if (projectConfigExists()) {
    targets.push("claude");
  }

  if (codexProjectConfigExists()) {
    targets.push("codex");
  }

  return targets;
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

async function ensureGitignoreForFinalWrapperState(): Promise<void> {
  const referencedWrappers = await collectReferencedWrapperPaths();

  if (referencedWrappers.size > 0) {
    await ensureMcpkitGitignoreBlock();
  }
}

async function runClaudeUpdateFlow(): Promise<void> {
  const projectConfig = await readProjectConfig();
  const registry = await readRegistry();
  const outcomes: UpdateOutcome[] = [];

  for (const serverName of Object.keys(projectConfig.mcpServers)) {
    const registryEntry = registry.servers[serverName];

    if (!registryEntry) {
      outcomes.push({ kind: "preserved_missing_registry", serverName });
      continue;
    }

    const emitted = await emitClaudeProjectServer(serverName, registryEntry);

    if (emitted.skipped) {
      outcomes.push({
        kind: "preserved_skipped",
        serverName,
        reason: emitted.reason ?? "could not be refreshed safely",
      });
      continue;
    }

    projectConfig.mcpServers[serverName] = emitted.config!;
    outcomes.push({
      kind: emitted.usedWrapper ? "refreshed_wrapper" : "refreshed_direct",
      serverName,
    });
  }

  await writeProjectConfig(projectConfig);
  printTargetSummary("Claude Code", outcomes, ".mcp.json");
}

async function runCodexUpdateFlow(): Promise<void> {
  const projectConfig = await readCodexProjectConfig();
  const registry = await readCodexRegistry();
  const projectServers = ensureCodexMcpServers(projectConfig);
  const registryServers = ensureCodexMcpServers(registry);
  const outcomes: UpdateOutcome[] = [];

  for (const serverName of Object.keys(projectServers)) {
    const registryEntry = registryServers[serverName];

    if (!registryEntry) {
      outcomes.push({ kind: "preserved_missing_registry", serverName });
      continue;
    }

    const emitted = await emitCodexProjectServer(serverName, registryEntry);

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

  await writeCodexProjectConfig(projectConfig);
  printTargetSummary("Codex CLI", outcomes, ".codex/config.toml");
}

/**
 * Command handler for 'mcpkit update'
 */
export async function updateCommand(options: TargetOptions): Promise<void> {
  const requestedTargets = getRequestedTargets(options);

  if (requestedTargets.length === 0) {
    const detectedTargets = getDetectedTargets();

    if (detectedTargets.length === 0) {
      printNoProjectConfigMessage();
      return;
    }

    for (const target of detectedTargets) {
      if (target === "claude") {
        await runClaudeUpdateFlow();
      } else {
        await runCodexUpdateFlow();
      }
    }

    await ensureGitignoreForFinalWrapperState();
    return;
  }

  let ranAnyTarget = false;

  for (const target of requestedTargets) {
    if (target === "claude") {
      if (!projectConfigExists()) {
        printMissingTargetConfigMessage("claude");
        continue;
      }

      await runClaudeUpdateFlow();
      ranAnyTarget = true;
      continue;
    }

    if (!codexProjectConfigExists()) {
      printMissingTargetConfigMessage("codex");
      continue;
    }

    await runCodexUpdateFlow();
    ranAnyTarget = true;
  }

  if (!ranAnyTarget) {
    return;
  }

  await ensureGitignoreForFinalWrapperState();
}
