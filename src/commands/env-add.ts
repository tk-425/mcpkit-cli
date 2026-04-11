import chalk from "chalk";
import { addConfiguredLoadEnvVar } from "../utils/load-env-config.js";

/**
 * Command handler for 'mcpkit env add'
 */
export async function envAddCommand(name: string): Promise<void> {
  try {
    const added = await addConfiguredLoadEnvVar(name);

    if (!added) {
      console.log(chalk.yellow(`"${name.trim()}" is already in ~/.mcpkit/load-env.json`));
      return;
    }

    console.log(chalk.green(`✓ Added "${name.trim()}" to ~/.mcpkit/load-env.json`));
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    } else {
      console.error(chalk.red("An unexpected error occurred"));
    }
    process.exit(1);
  }
}
