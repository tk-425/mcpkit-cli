// Import checkbox from inquirer
import { checkbox, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import {
  removeServerFromProject,
  projectConfigExists,
  readProjectConfig,
} from "../utils/project-config.js";

/**
 * Command handler for 'mcpkit remove'
 */
export async function removeCommand(): Promise<void> {
  try {
    // Check if .mcp.json exists
    if (!projectConfigExists()) {
      console.error(
        chalk.red("Error: .mcp.json not found in current directory"),
      );
      console.log(
        chalk.gray('Use "mcpkit init" to create a project configuration first'),
      );
      process.exit(1);
    }

    const config = await readProjectConfig();
    const serverNames = Object.keys(config.mcpServers);

    if (serverNames.length === 0) {
      console.log(chalk.yellow("No MCP servers found in .mcp.json"));
      return;
    }

    console.log(chalk.blue("\nSelect MCP Servers to remove from .mcp.json:"));
    console.log(
      chalk.gray(
        "(Use ↑/↓ to navigate, space to select/deselect, enter to confirm)\n",
      ),
    );

    const serversToRemove = await checkbox({
      message: "Choose servers to remove:",
      choices: serverNames.map((name) => ({
        name,
        value: name,
        checked: false,
      })),
      required: false,
    });

    if (serversToRemove.length === 0) {
      console.log(chalk.yellow("No servers selected for removal."));
      return;
    }

    const confirmed = await confirm({
      message: `Are you sure you want to remove ${serversToRemove.length} server(s)?`,
      default: false,
    });

    if (!confirmed) {
      console.log(chalk.yellow("Cancelled."));
      return;
    }

    for (const serverName of serversToRemove) {
      await removeServerFromProject(serverName);
      console.log(chalk.green(`✓ Removed "${serverName}" from .mcp.json`));
    }
  } catch (error) {
    throw error;
  }
}
