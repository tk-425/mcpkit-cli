import { checkbox, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { readRegistry } from "../utils/registry.js";
import {
  writeProjectConfig,
  readProjectConfig,
  projectConfigExists,
} from "../utils/project-config.js";
import type { ProjectConfig } from "../utils/project-config.js";
import {
  readCodexRegistry,
  readCodexProjectConfigOrDefault,
  writeCodexProjectConfig,
  codexProjectConfigExists,
  ensureCodexMcpServers,
  type CodexConfigFile,
} from "../utils/codex-config.js";
import {
  type TargetOptions,
} from "../utils/targets.js";
import { resolveProjectTargets } from "./project-targets.js";

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

async function runClaudeInitFlow(): Promise<void> {
  const registry = await readRegistry();
  const serverNames = Object.keys(registry.servers).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  if (serverNames.length === 0) {
    console.log(chalk.yellow("No Claude Code MCP servers in registry."));
    console.log(
      chalk.gray(
        'Use "mcpkit registry add --claude" to add servers to your registry first.',
      ),
    );
    return;
  }

  const configExists = projectConfigExists();
  let shouldMerge = false;

  if (configExists) {
    const action = await confirm({
      message:
        ".mcp.json already exists. Do you want to merge with existing servers?",
      default: true,
    });

    if (action) {
      shouldMerge = true;
    } else {
      const shouldOverwrite = await confirm({
        message: "Overwrite existing .mcp.json?",
        default: false,
      });

      if (!shouldOverwrite) {
        console.log(chalk.yellow("Claude Code init cancelled."));
        return;
      }
    }
  }

  const selectedServers = await promptServerSelection(
    serverNames,
    "Select Claude Code MCP servers for .mcp.json:",
  );

  if (selectedServers.length === 0) {
    console.log(chalk.yellow("No Claude Code servers selected. Cancelled."));
    return;
  }

  let projectConfig: ProjectConfig;

  if (shouldMerge && configExists) {
    projectConfig = await readProjectConfig();
  } else {
    projectConfig = { mcpServers: {} };
  }

  selectedServers.forEach((serverName) => {
    projectConfig.mcpServers[serverName] = registry.servers[serverName];
  });

  await writeProjectConfig(projectConfig);

  console.log(
    chalk.green(
      `\n✓ Created .mcp.json with ${selectedServers.length} Claude server${selectedServers.length === 1 ? "" : "s"}`,
    ),
  );
  console.log(chalk.gray("Selected Claude Code servers:"));
  selectedServers.forEach((name) => {
    console.log(chalk.gray(`  • ${name}`));
  });
}

async function runCodexInitFlow(): Promise<void> {
  const registry = await readCodexRegistry();
  const registryServers = ensureCodexMcpServers(registry);
  const serverNames = Object.keys(registryServers).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  if (serverNames.length === 0) {
    console.log(chalk.yellow("No Codex CLI MCP servers in registry."));
    console.log(
      chalk.gray(
        'Use "mcpkit registry add --codex" to add servers to your registry first.',
      ),
    );
    return;
  }

  const configExists = codexProjectConfigExists();
  let shouldMerge = false;

  if (configExists) {
    const action = await confirm({
      message:
        ".codex/config.toml already exists. Do you want to merge with existing servers?",
      default: true,
    });

    if (action) {
      shouldMerge = true;
    } else {
      const shouldOverwrite = await confirm({
        message: "Overwrite MCP server entries in .codex/config.toml?",
        default: false,
      });

      if (!shouldOverwrite) {
        console.log(chalk.yellow("Codex CLI init cancelled."));
        return;
      }
    }
  }

  const selectedServers = await promptServerSelection(
    serverNames,
    "Select Codex CLI MCP servers for .codex/config.toml:",
  );

  if (selectedServers.length === 0) {
    console.log(chalk.yellow("No Codex CLI servers selected. Cancelled."));
    return;
  }

  let projectConfig: CodexConfigFile;

  if (configExists) {
    projectConfig = await readCodexProjectConfigOrDefault();
    if (!shouldMerge) {
      projectConfig.mcp_servers = {};
    }
  } else {
    projectConfig = { mcp_servers: {} };
  }

  const projectServers = ensureCodexMcpServers(projectConfig);
  selectedServers.forEach((serverName) => {
    projectServers[serverName] = registryServers[serverName];
  });

  await writeCodexProjectConfig(projectConfig);

  console.log(
    chalk.green(
      `\n✓ Updated .codex/config.toml with ${selectedServers.length} Codex server${selectedServers.length === 1 ? "" : "s"}`,
    ),
  );
  console.log(chalk.gray("Selected Codex CLI servers:"));
  selectedServers.forEach((name) => {
    console.log(chalk.gray(`  • ${name}`));
  });
}

/**
 * Command handler for 'mcpkit init'
 */
export async function initCommand(options: TargetOptions): Promise<void> {
  try {
    const targets = await resolveProjectTargets(options);

    for (const target of targets) {
      if (target === "claude") {
        await runClaudeInitFlow();
      } else {
        await runCodexInitFlow();
      }
    }
  } catch (error) {
    throw error;
  }
}
