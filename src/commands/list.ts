import chalk from 'chalk';
import { readProjectConfig, projectConfigExists } from '../utils/project-config.js';

/**
 * Command handler for 'mcpkit list'
 */
export async function listCommand(options: { verbose?: boolean }): Promise<void> {
  try {
    // Check if .mcp.json exists
    if (!projectConfigExists()) {
      console.log(chalk.yellow('No .mcp.json found in current directory.'));
      console.log(chalk.gray('Use "mcpkit init" to create a project configuration.'));
      return;
    }

    const projectConfig = await readProjectConfig();
    const serverNames = Object.keys(projectConfig.mcpServers);

    if (serverNames.length === 0) {
      console.log(chalk.yellow('No MCP servers in project configuration.'));
      console.log(chalk.gray('Use "mcpkit add" or "mcpkit init" to add servers.'));
      return;
    }

    console.log(chalk.blue('MCP Servers in Project (.mcp.json):'));

    if (options.verbose) {
      // Show detailed config for each server
      serverNames.forEach((name) => {
        console.log(chalk.green(`\n  • ${name}`));
        const config = projectConfig.mcpServers[name];
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
