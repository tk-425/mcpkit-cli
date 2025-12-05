import chalk from 'chalk';
import { removeServerFromProject, projectConfigExists } from '../utils/project-config.js';

/**
 * Command handler for 'mcpkit remove <server-name>'
 */
export async function removeCommand(serverName: string): Promise<void> {
  try {
    // Validate server name provided
    if (!serverName || !serverName.trim()) {
      console.error(chalk.red('Error: Please provide a server name'));
      console.log(chalk.gray('Usage: mcpkit remove <server-name>'));
      process.exit(1);
    }

    // Check if .mcp.json exists
    if (!projectConfigExists()) {
      console.error(chalk.red('Error: .mcp.json not found in current directory'));
      console.log(chalk.gray('Use "mcpkit init" to create a project configuration first'));
      process.exit(1);
    }

    // Try to remove server from project
    const removed = await removeServerFromProject(serverName);

    if (!removed) {
      console.error(chalk.red(`Error: Server "${serverName}" not found in .mcp.json`));
      process.exit(1);
    }

    console.log(chalk.green(`✓ Removed "${serverName}" from .mcp.json`));
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    } else {
      console.error(chalk.red('An unexpected error occurred'));
    }
    process.exit(1);
  }
}
