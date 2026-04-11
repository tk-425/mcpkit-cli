import chalk from "chalk";
import { removeConfiguredLoadEnvVar } from "../utils/load-env-config.js";

/**
 * Command handler for 'mcpkit env remove'
 */
export async function envRemoveCommand(name: string): Promise<void> {
  try {
    const removed = await removeConfiguredLoadEnvVar(name);

    if (!removed) {
      console.log(chalk.yellow(`"${name.trim()}" was not found in ~/.mcpkit/load-env.json`));
      return;
    }

    console.log(chalk.green(`✓ Removed "${name.trim()}" from ~/.mcpkit/load-env.json`));
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    } else {
      console.error(chalk.red("An unexpected error occurred"));
    }
    process.exit(1);
  }
}
