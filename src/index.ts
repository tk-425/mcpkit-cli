#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { Command } from "commander";
import chalk from "chalk";
import { registryAddCommand } from "./commands/registry-add.js";
import { registryRemoveCommand } from "./commands/registry-remove.js";
import { registryListCommand } from "./commands/registry-list.js";
import { listCommand } from "./commands/list.js";
import { initCommand } from "./commands/init.js";
import { editCommand } from "./commands/edit.js";
import { addCommand } from "./commands/add.js";
import { removeCommand } from "./commands/remove.js";
import { refreshCommand } from "./commands/update.js";
import { hooksAddCommand } from "./commands/hooks-add.js";
import { hooksApplyCommand } from "./commands/hooks-apply.js";
import { hooksRemoveCommand } from "./commands/hooks-remove.js";
import { hooksListCommand } from "./commands/hooks-list.js";

const program = new Command();
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
) as { version: string };

function withTargetOptions(command: Command): Command {
  return command
    .option("--claude", "Target Claude Code configuration")
    .option("--codex", "Target Codex CLI configuration")
    .option("--opencode", "Target OpenCode CLI configuration")
    .option("--agy", "Target Antigravity CLI configuration")
    .option("--cursor", "Target Cursor configuration");
}

program
  .name("mcpkit")
  .description("MCP Server Configuration Manager")
  .version(packageJson.version);

// Init command
withTargetOptions(
  program
    .command("init")
  .description("Create project MCP config with selected servers from registry")
).action(initCommand);

// Edit command
withTargetOptions(
  program
    .command("edit")
  .description("Edit or add an MCP server to the selected project config")
).action(editCommand);

// Add command
withTargetOptions(
  program
    .command("add")
  .description("Add servers from registry to the selected project config")
).action(addCommand);

// Remove command
withTargetOptions(
  program
    .command("remove")
  .description("Remove MCP servers from the selected project config")
).action(removeCommand);

// Refresh command
withTargetOptions(
  program
    .command("refresh")
  .description("Refresh existing project MCP servers from the registry")
).action(refreshCommand);

// List command
withTargetOptions(
  program
    .command("list")
  .description("Display all MCP servers in the current project")
  .option("-v, --verbose", "Show detailed server configurations")
).action(listCommand);

// Registry subcommands
const registry = program
  .command("registry")
  .description("Manage the global MCP server registry");

withTargetOptions(
  registry
    .command("add")
  .description("Add a new MCP server to the registry")
).action(registryAddCommand);

withTargetOptions(
  registry
    .command("remove")
  .description("Remove MCP servers from the registry")
).action(registryRemoveCommand);

withTargetOptions(
  registry
    .command("list")
  .description("Display all MCP servers in the registry")
  .option("-v, --verbose", "Show detailed server configurations")
).action(registryListCommand);

// Hooks subcommands
const hooks = program
  .command("hooks")
  .description("Manage per-platform hook registries and project hook files");

withTargetOptions(
  hooks
    .command("add")
    .description("Add a hook entry to a platform's hook registry")
).action(hooksAddCommand);

withTargetOptions(
  hooks
    .command("apply")
    .description("Apply saved hooks from a registry to the project hook file")
).action(hooksApplyCommand);

withTargetOptions(
  hooks
    .command("remove")
    .description("Remove hooks from the project hook file (registry untouched)")
).action(hooksRemoveCommand);

withTargetOptions(
  hooks
    .command("list")
    .description("Display hook entries in the project hook files (or hook registries with --registry)")
    .option("--registry", "Show the MCPKit home hook registries instead of project hook files")
).action(hooksListCommand);

// Handle graceful exit
try {
  await program.parseAsync();
} catch (error) {
  if (
    error instanceof Error &&
    error.message.includes("User force closed the prompt with SIGINT")
  ) {
    console.log(chalk.green("\nGood bye! 👋"));
    process.exit(0);
  } else {
    throw error;
  }
}
