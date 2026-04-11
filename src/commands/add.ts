import { checkbox } from "@inquirer/prompts";
import chalk from "chalk";
import { readRegistry } from "../utils/registry.js";
import {
  writeProjectConfig,
  readProjectConfig,
  projectConfigExists,
} from "../utils/project-config.js";
import {
  readCodexRegistry,
  readCodexProjectConfig,
  writeCodexProjectConfig,
  codexProjectConfigExists,
  ensureCodexMcpServers,
} from "../utils/codex-config.js";
import {
  type TargetOptions,
} from "../utils/targets.js";
import { resolveProjectTargets } from "./project-targets.js";
import { emitClaudeProjectServer, emitCodexProjectServer } from "../utils/project-emitter.js";
import { ensureMcpkitGitignoreBlock } from "../utils/gitignore.js";
import { syncLoadEnvWithReferencedWrappers } from "../utils/project-runtime.js";

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

async function runClaudeAddFlow(): Promise<void> {
  if (!projectConfigExists()) {
    console.error(chalk.red("Error: .mcp.json not found in current directory"));
    console.log(
      chalk.gray('Use "mcpkit init --claude" or "mcpkit init" to create it first'),
    );
    return;
  }

  const projectConfig = await readProjectConfig();
  const registry = await readRegistry();
  const projectServerNames = Object.keys(projectConfig.mcpServers);
  const registryServerNames = Object.keys(registry.servers).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const availableServers = registryServerNames.filter(
    (name) => !projectServerNames.includes(name),
  );

  if (availableServers.length === 0) {
    console.log(chalk.yellow("No new Claude Code servers available to add."));
    return;
  }

  const selectedServers = await promptServerSelection(
    availableServers,
    "Select Claude Code MCP servers to add to .mcp.json:",
  );

  if (selectedServers.length === 0) {
    console.log(chalk.yellow("No Claude Code servers selected. Cancelled."));
    return;
  }

  let usedWrapper = false;
  const skippedServers: string[] = [];
  let addedCount = 0;

  for (const serverName of selectedServers) {
    const emitted = await emitClaudeProjectServer(serverName, registry.servers[serverName]);
    if (emitted.skipped) {
      skippedServers.push(emitted.reason ?? `Skipped "${serverName}"`);
      continue;
    }

    projectConfig.mcpServers[serverName] = emitted.config!;
    usedWrapper = usedWrapper || emitted.usedWrapper;
    addedCount += 1;
  }

  if (usedWrapper) {
    await ensureMcpkitGitignoreBlock();
  }

  if (addedCount === 0) {
    console.log(chalk.yellow("No Claude Code servers were added."));
    skippedServers.forEach((message) => {
      console.log(chalk.yellow(`  • ${message}`));
    });
    return;
  }

  await writeProjectConfig(projectConfig);
  await syncLoadEnvWithReferencedWrappers();

  console.log(
    chalk.green(
      `\n✓ Added ${selectedServers.length} Claude server${selectedServers.length === 1 ? "" : "s"} to .mcp.json`,
    ),
  );
  if (skippedServers.length > 0) {
    console.log(chalk.yellow("\nSkipped Claude Code servers:"));
    skippedServers.forEach((message) => {
      console.log(chalk.yellow(`  • ${message}`));
    });
  }
}

async function runCodexAddFlow(): Promise<void> {
  if (!codexProjectConfigExists()) {
    console.error(
      chalk.red("Error: .codex/config.toml not found in current directory"),
    );
    console.log(
      chalk.gray('Use "mcpkit init --codex" or "mcpkit init" to create it first'),
    );
    return;
  }

  const projectConfig = await readCodexProjectConfig();
  const registry = await readCodexRegistry();
  const projectServers = ensureCodexMcpServers(projectConfig);
  const registryServers = ensureCodexMcpServers(registry);
  const availableServers = Object.keys(registryServers).filter(
    (name) => !(name in projectServers),
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  if (availableServers.length === 0) {
    console.log(chalk.yellow("No new Codex CLI servers available to add."));
    return;
  }

  const selectedServers = await promptServerSelection(
    availableServers,
    "Select Codex CLI MCP servers to add to .codex/config.toml:",
  );

  if (selectedServers.length === 0) {
    console.log(chalk.yellow("No Codex CLI servers selected. Cancelled."));
    return;
  }

  let usedWrapper = false;
  const skippedServers: string[] = [];
  let addedCount = 0;

  for (const serverName of selectedServers) {
    const emitted = await emitCodexProjectServer(serverName, registryServers[serverName]);
    if (emitted.skipped) {
      skippedServers.push(emitted.reason ?? `Skipped "${serverName}"`);
      continue;
    }

    projectServers[serverName] = emitted.config!;
    usedWrapper = usedWrapper || emitted.usedWrapper;
    addedCount += 1;
  }

  if (usedWrapper) {
    await ensureMcpkitGitignoreBlock();
  }

  if (addedCount === 0) {
    console.log(chalk.yellow("No Codex CLI servers were added."));
    skippedServers.forEach((message) => {
      console.log(chalk.yellow(`  • ${message}`));
    });
    return;
  }

  await writeCodexProjectConfig(projectConfig);
  await syncLoadEnvWithReferencedWrappers();

  console.log(
    chalk.green(
      `\n✓ Added ${selectedServers.length} Codex server${selectedServers.length === 1 ? "" : "s"} to .codex/config.toml`,
    ),
  );
  if (skippedServers.length > 0) {
    console.log(chalk.yellow("\nSkipped Codex CLI servers:"));
    skippedServers.forEach((message) => {
      console.log(chalk.yellow(`  • ${message}`));
    });
  }
}

/**
 * Command handler for 'mcpkit add'
 */
export async function addCommand(options: TargetOptions): Promise<void> {
  try {
    const targets = await resolveProjectTargets(options);

    for (const target of targets) {
      if (target === "claude") {
        await runClaudeAddFlow();
      } else {
        await runCodexAddFlow();
      }
    }
  } catch (error) {
    throw error;
  }
}
