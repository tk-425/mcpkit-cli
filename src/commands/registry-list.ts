import chalk from 'chalk';
import { readRegistry } from '../utils/registry.js';

/**
 * Command handler for 'mcpkit registry list'
 */
export async function registryListCommand(options: { verbose?: boolean }): Promise<void> {
  try {
    const registry = await readRegistry();
    const serverNames = Object.keys(registry.servers);

    if (serverNames.length === 0) {
      console.log(chalk.yellow('No MCP servers in registry.'));
      console.log(chalk.gray('Use "mcpkit registry add" to add servers to your registry.'));
      return;
    }

    console.log(chalk.blue('MCP Servers in Registry:'));

    if (options.verbose) {
      // Show detailed config for each server
      serverNames.forEach((name) => {
        console.log(chalk.green(`\n  • ${name}`));
        const config = registry.servers[name];
        console.log(chalk.gray(`    ${JSON.stringify(config, null, 4).replace(/\n/g, '\n    ')}`));
      });
    } else {
      // Show just the names
      serverNames.forEach((name) => {
        console.log(chalk.green(`  • ${name}`));
      });
    }

    console.log();
    console.log(chalk.gray(`Total: ${serverNames.length} server${serverNames.length === 1 ? '' : 's'}`));
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    } else {
      console.error(chalk.red('An unexpected error occurred'));
    }
    process.exit(1);
  }
}
