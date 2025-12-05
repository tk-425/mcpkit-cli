import { editor, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { addServerToRegistry, serverExistsInRegistry } from '../utils/registry.js';
import { parseServerInput } from '../utils/validation.js';

/**
 * Command handler for 'mcpkit registry add'
 */
export async function registryAddCommand(): Promise<void> {
  try {
    console.log(chalk.blue('Opening editor for MCP server configuration...'));
    console.log();
    console.log(chalk.gray('Instructions:'));
    console.log(chalk.gray('  1. Paste your multi-line JSON configuration'));
    console.log(chalk.gray('  2. Save and exit (vim: :wq | nano: Ctrl+O then Ctrl+X)'));
    console.log();
    console.log(chalk.gray('Example formats:'));
    console.log(chalk.gray('Stdio server:'));
    console.log(chalk.gray('  "playwright": {'));
    console.log(chalk.gray('    "command": "npx",'));
    console.log(chalk.gray('    "args": ["@playwright/mcp@latest"]'));
    console.log(chalk.gray('  }'));
    console.log(chalk.gray('Streaming server:'));
    console.log(chalk.gray('  "context7": {'));
    console.log(chalk.gray('    "url": "https://api.context7.ai/mcp"'));
    console.log(chalk.gray('  }'));
    console.log();

    const pastedInput = await editor({
      message: 'Enter server configuration (paste JSON and save):',
      default: '',
      validate: (value) => {
        if (!value.trim()) {
          return 'Please provide a server configuration';
        }
        try {
          parseServerInput(value);
          return true;
        } catch (error) {
          return error instanceof Error ? error.message : 'Invalid configuration';
        }
      },
    });

    const { name, config } = parseServerInput(pastedInput);

    // Check if server already exists
    const exists = await serverExistsInRegistry(name);
    if (exists) {
      const shouldOverwrite = await confirm({
        message: `Server "${name}" already exists in registry. Overwrite?`,
        default: false,
      });

      if (!shouldOverwrite) {
        console.log(chalk.yellow('Cancelled.'));
        return;
      }
    }

    // Add to registry
    await addServerToRegistry(name, config);

    console.log(chalk.green(`✓ Added "${name}" to registry (~/.mcpkit/mcp-servers.json)`));
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    } else {
      console.error(chalk.red('An unexpected error occurred'));
    }
    process.exit(1);
  }
}
