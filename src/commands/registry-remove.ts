// Import checkbox from inquirer
import { checkbox, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { removeServerFromRegistry, readRegistry } from "../utils/registry.js";

/**
 * Command handler for 'mcpkit registry remove'
 */
export async function registryRemoveCommand(): Promise<void> {
  try {
    const registry = await readRegistry();
    const serverNames = Object.keys(registry.servers);

    if (serverNames.length === 0) {
      console.log(chalk.yellow("No MCP servers found in registry"));
      return;
    }

    console.log(chalk.blue("\nSelect MCP Servers to remove from registry:"));
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
      await removeServerFromRegistry(serverName);
      console.log(
        chalk.green(
          `✓ Removed "${serverName}" from registry (~/.mcpkit/mcp-servers.json)`,
        ),
      );
    }
  } catch (error) {
    throw error;
  }
}
