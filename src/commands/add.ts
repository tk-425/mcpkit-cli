import { checkbox, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { readRegistry } from "../utils/registry.js";
import {
  writeProjectConfig,
  readProjectConfig,
  projectConfigExists,
} from "../utils/project-config.js";

/**
 * Command handler for 'mcpkit add'
 */
export async function addCommand(): Promise<void> {
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

    // Read project config and registry
    const projectConfig = await readProjectConfig();
    const registry = await readRegistry();

    const projectServerNames = Object.keys(projectConfig.mcpServers);
    const registryServerNames = Object.keys(registry.servers);

    // Filter available servers
    const availableServers = registryServerNames.filter(
      (name) => !projectServerNames.includes(name),
    );

    if (availableServers.length === 0) {
      console.log(chalk.yellow("No new servers available to add."));
      console.log(
        chalk.gray(
          "All registry servers are already in your project or the registry is empty.",
        ),
      );
      return;
    }

    console.log(chalk.blue("\nSelect MCP Servers to add to .mcp.json:"));
    console.log(
      chalk.gray(
        "(Use ↑/↓ to navigate, space to select/deselect, enter to confirm)\n",
      ),
    );

    const selectedServers = await checkbox({
      message: "Choose servers to add:",
      choices: availableServers.map((name) => ({
        name,
        value: name,
        checked: false,
      })),
      required: false,
    });

    if (selectedServers.length === 0) {
      console.log(chalk.yellow("No servers selected. Cancelled."));
      return;
    }

    // Add selected servers
    for (const serverName of selectedServers) {
      projectConfig.mcpServers[serverName] = registry.servers[serverName];
    }

    // Write to .mcp.json
    await writeProjectConfig(projectConfig);

    console.log(
      chalk.green(
        `\n✓ Added ${selectedServers.length} server${selectedServers.length === 1 ? "" : "s"} to .mcp.json`,
      ),
    );
    console.log(chalk.gray("Added servers:"));
    selectedServers.forEach((name) => {
      console.log(chalk.gray(`  • ${name}`));
    });
  } catch (error) {
    throw error;
  }
}
