#!/usr/bin/env node

import { Command } from 'commander';
import { registryAddCommand } from './commands/registry-add.js';
import { registryRemoveCommand } from './commands/registry-remove.js';
import { registryListCommand } from './commands/registry-list.js';
import { listCommand } from './commands/list.js';
import { initCommand } from './commands/init.js';
import { addCommand } from './commands/add.js';
import { removeCommand } from './commands/remove.js';

const program = new Command();

program
  .name('mcpkit')
  .description('MCP Server Configuration Manager')
  .version('0.1.0');

// Init command
program
  .command('init')
  .description('Create .mcp.json file with selected servers from registry')
  .action(initCommand);

// Add command
program
  .command('add')
  .description('Add a new MCP server to the project .mcp.json')
  .action(addCommand);

// Remove command
program
  .command('remove <server-name>')
  .description('Remove an MCP server from the project .mcp.json')
  .action(removeCommand);

// List command
program
  .command('list')
  .description('Display all MCP servers in the current project')
  .option('-v, --verbose', 'Show detailed server configurations')
  .action(listCommand);

// Registry subcommands
const registry = program
  .command('registry')
  .description('Manage the global MCP server registry');

registry
  .command('add')
  .description('Add a new MCP server to the registry')
  .action(registryAddCommand);

registry
  .command('remove <server-name>')
  .description('Remove an MCP server from the registry')
  .action(registryRemoveCommand);

registry
  .command('list')
  .description('Display all MCP servers in the registry')
  .option('-v, --verbose', 'Show detailed server configurations')
  .action(registryListCommand);

program.parse();
