#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import packageJson from "../package.json";
import { registryAddCommand } from "./commands/registry-add.js";
import { registryRemoveCommand } from "./commands/registry-remove.js";
import { registryListCommand } from "./commands/registry-list.js";
import { listCommand } from "./commands/list.js";
import { initCommand } from "./commands/init.js";
import { editCommand } from "./commands/edit.js";
import { addCommand } from "./commands/add.js";
import { removeCommand } from "./commands/remove.js";

const program = new Command();

function withTargetOptions(command: Command): Command {
  return command
    .option("--claude", "Target Claude Code configuration")
    .option("--codex", "Target Codex CLI configuration");
}

program
  .name("mcpkit")
  .description("MCP Server Configuration Manager")
  .version(packageJson.version);

// Init command
withTargetOptions(
  program
    .command("init")
  .description("Create .mcp.json file with selected servers from registry")
).action(initCommand);

// Edit command
withTargetOptions(
  program
    .command("edit")
  .description("Edit or add an MCP server to the project .mcp.json")
).action(editCommand);

// Add command
withTargetOptions(
  program
    .command("add")
  .description("Add servers from registry to .mcp.json")
).action(addCommand);

// Remove command
withTargetOptions(
  program
    .command("remove")
  .description("Remove MCP servers from the project .mcp.json")
).action(removeCommand);

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
