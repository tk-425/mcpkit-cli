import { editor, select } from "@inquirer/prompts";
import chalk from "chalk";
import {
  addServerToProject,
  projectConfigExists,
  readProjectConfig,
} from "../utils/project-config.js";
import {
  addServerToCodexProject,
  codexProjectConfigExists,
  readCodexProjectConfig,
  ensureCodexMcpServers,
} from "../utils/codex-config.js";
import { stringifyToml } from "../utils/toml.js";
import { parseCodexServerInput, parseServerInput } from "../utils/validation.js";
import type { TargetOptions } from "../utils/targets.js";
import { resolveSingleTarget } from "./single-target.js";

async function runClaudeEditFlow(): Promise<void> {
  if (!projectConfigExists()) {
    console.error(chalk.red("Error: .mcp.json not found in current directory"));
    console.log(
      chalk.gray('Use "mcpkit init --claude" or "mcpkit init" to create it first'),
    );
    return;
  }

  const config = await readProjectConfig();
  const serverNames = Object.keys(config.mcpServers).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );

  if (serverNames.length === 0) {
    console.log(chalk.yellow("No Claude Code MCP servers found in .mcp.json"));
    return;
  }

  const selectedName = await select({
    message: "Choose a Claude Code server to edit:",
    choices: serverNames.map((name) => ({ name, value: name })),
  });

  const defaultValue = JSON.stringify(
    { [selectedName]: config.mcpServers[selectedName] },
    null,
    2,
  );

  console.log(chalk.blue("Opening editor for MCP server configuration..."));
  console.log();
  console.log(chalk.gray("Instructions:"));
  console.log(chalk.gray("  1. Edit the JSON configuration"));
  console.log(
    chalk.gray("  2. Save and exit (vim: :wq | nano: Ctrl+O then Ctrl+X)"),
  );
  console.log();

  const pastedInput = await editor({
    message: "Edit server configuration (save and exit to confirm):",
    default: defaultValue,
    validate: (value) => {
      if (!value.trim()) {
        return "Please provide a server configuration";
      }
      try {
        parseServerInput(value);
        return true;
      } catch (error) {
        return error instanceof Error ? error.message : "Invalid configuration";
      }
    },
  });

  const { name, config: updatedConfig } = parseServerInput(pastedInput);
  await addServerToProject(name, updatedConfig);
  console.log(chalk.green(`✓ Updated "${name}" in .mcp.json`));
}

async function runCodexEditFlow(): Promise<void> {
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
  const servers = ensureCodexMcpServers(config);
  const serverNames = Object.keys(servers).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );

  if (serverNames.length === 0) {
    console.log(
      chalk.yellow("No Codex CLI MCP servers found in .codex/config.toml"),
    );
    return;
  }

  const selectedName = await select({
    message: "Choose a Codex CLI server to edit:",
    choices: serverNames.map((name) => ({ name, value: name })),
  });

  const defaultValue = stringifyToml({
    mcp_servers: { [selectedName]: servers[selectedName] },
  });

  console.log(chalk.blue("Opening editor for MCP server configuration..."));
  console.log();
  console.log(chalk.gray("Instructions:"));
  console.log(chalk.gray("  1. Edit the TOML configuration"));
  console.log(
    chalk.gray("  2. Save and exit (vim: :wq | nano: Ctrl+O then Ctrl+X)"),
  );
  console.log();

  const pastedInput = await editor({
    message: "Edit Codex server configuration (save and exit to confirm):",
    default: defaultValue,
    validate: (value) => {
      if (!value.trim()) {
        return "Please provide a server configuration";
      }
      try {
        parseCodexServerInput(value);
        return true;
      } catch (error) {
        return error instanceof Error ? error.message : "Invalid configuration";
      }
    },
  });

  const { name, config: updatedConfig } = parseCodexServerInput(pastedInput);
  await addServerToCodexProject(name, updatedConfig);
  console.log(chalk.green(`✓ Updated "${name}" in .codex/config.toml`));
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

    if (target === "claude") {
      await runClaudeEditFlow();
    } else {
      await runCodexEditFlow();
    }
  } catch (error) {
    throw error;
  }
}
