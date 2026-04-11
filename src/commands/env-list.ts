import chalk from "chalk";
import { listConfiguredLoadEnvVars } from "../utils/load-env-config.js";

/**
 * Command handler for 'mcpkit env list'
 */
export async function envListCommand(): Promise<void> {
  try {
    const envVars = await listConfiguredLoadEnvVars();

    console.log(chalk.blue("Global load-env environment variables (~/.mcpkit/load-env.json):"));

    if (envVars.length === 0) {
      console.log(chalk.yellow("  No environment variables configured"));
      return;
    }

    envVars.forEach((name) => {
      console.log(chalk.green(`  • ${name}`));
    });

    console.log(chalk.gray(`Total: ${envVars.length} variable${envVars.length === 1 ? "" : "s"}`));
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    } else {
      console.error(chalk.red("An unexpected error occurred"));
    }
    process.exit(1);
  }
}
