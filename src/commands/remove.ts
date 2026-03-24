import { checkbox, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import {
  removeServerFromProject,
  projectConfigExists,
  readProjectConfig,
} from "../utils/project-config.js";
import {
  removeServerFromCodexProject,
  codexProjectConfigExists,
  readCodexProjectConfig,
  ensureCodexMcpServers,
} from "../utils/codex-config.js";
import {
  type TargetOptions,
} from "../utils/targets.js";
import { resolveProjectTargets } from "./project-targets.js";

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

async function runClaudeRemoveFlow(): Promise<void> {
  if (!projectConfigExists()) {
    console.error(chalk.red("Error: .mcp.json not found in current directory"));
    console.log(
      chalk.gray('Use "mcpkit init --claude" or "mcpkit init" to create it first'),
    );
    return;
  }

  const config = await readProjectConfig();
  const serverNames = Object.keys(config.mcpServers).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  if (serverNames.length === 0) {
    console.log(chalk.yellow("No Claude Code MCP servers found in .mcp.json"));
    return;
  }

  const serversToRemove = await promptServerRemoval(
    serverNames,
    "Select Claude Code MCP servers to remove from .mcp.json:",
  );

  if (serversToRemove.length === 0) {
    console.log(chalk.yellow("No Claude Code servers selected for removal."));
    return;
  }

  const confirmed = await confirm({
    message: `Remove ${serversToRemove.length} Claude server(s) from .mcp.json?`,
    default: false,
  });

  if (!confirmed) {
    console.log(chalk.yellow("Claude Code removal cancelled."));
    return;
  }

  for (const serverName of serversToRemove) {
    await removeServerFromProject(serverName);
    console.log(chalk.green(`✓ Removed "${serverName}" from .mcp.json`));
  }
}

async function runCodexRemoveFlow(): Promise<void> {
  if (!codexProjectConfigExists()) {
    console.error(
      chalk.red("Error: .codex/config.toml not found in current directory"),
    );
    console.log(
      chalk.gray('Use "mcpkit init --codex" or "mcpkit init" to create it first'),
    );
    return;
  }

  const config = await readCodexProjectConfig();
  const serverNames = Object.keys(ensureCodexMcpServers(config)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  if (serverNames.length === 0) {
    console.log(chalk.yellow("No Codex CLI MCP servers found in .codex/config.toml"));
    return;
  }

  const serversToRemove = await promptServerRemoval(
    serverNames,
    "Select Codex CLI MCP servers to remove from .codex/config.toml:",
  );

  if (serversToRemove.length === 0) {
    console.log(chalk.yellow("No Codex CLI servers selected for removal."));
    return;
  }

  const confirmed = await confirm({
    message: `Remove ${serversToRemove.length} Codex server(s) from .codex/config.toml?`,
    default: false,
  });

  if (!confirmed) {
    console.log(chalk.yellow("Codex CLI removal cancelled."));
    return;
  }

  for (const serverName of serversToRemove) {
    await removeServerFromCodexProject(serverName);
    console.log(
      chalk.green(`✓ Removed "${serverName}" from .codex/config.toml`),
    );
  }
}

/**
 * Command handler for 'mcpkit remove'
 */
export async function removeCommand(options: TargetOptions): Promise<void> {
  try {
    const targets = await resolveProjectTargets(options);

    for (const target of targets) {
      if (target === "claude") {
        await runClaudeRemoveFlow();
      } else {
        await runCodexRemoveFlow();
      }
    }
  } catch (error) {
    throw error;
  }
}
