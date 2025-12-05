import chalk from 'chalk';
import { removeServerFromRegistry, serverExistsInRegistry } from '../utils/registry.js';

/**
 * Command handler for 'mcpkit registry remove <server-name>'
 */
export async function registryRemoveCommand(serverName: string): Promise<void> {
  try {
    // Validate server name provided
    if (!serverName || !serverName.trim()) {
      console.error(chalk.red('Error: Please provide a server name'));
      console.log(chalk.gray('Usage: mcpkit registry remove <server-name>'));
      process.exit(1);
    }

    // Check if server exists in registry
    const exists = await serverExistsInRegistry(serverName);
    if (!exists) {
      console.error(chalk.red(`Error: Server "${serverName}" not found in registry`));
      console.log(chalk.gray('Use "mcpkit list" to see available servers'));
      process.exit(1);
    }

    // Remove from registry
    await removeServerFromRegistry(serverName);

    console.log(chalk.green(`✓ Removed "${serverName}" from registry (~/.mcpkit/mcp-servers.json)`));
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    } else {
      console.error(chalk.red('An unexpected error occurred'));
    }
    process.exit(1);
  }
}
