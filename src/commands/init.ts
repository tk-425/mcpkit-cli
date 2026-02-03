import { checkbox, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { readRegistry } from "../utils/registry.js";
import {
  writeProjectConfig,
  readProjectConfig,
  projectConfigExists,
} from "../utils/project-config.js";
import type { ProjectConfig } from "../utils/project-config.js";

/**
 * Command handler for 'mcpkit init'
 */
export async function initCommand(): Promise<void> {
  try {
    // Read available servers from registry
    const registry = await readRegistry();
    const serverNames = Object.keys(registry.servers);

    if (serverNames.length === 0) {
      console.log(chalk.yellow("No MCP servers in registry."));
      console.log(
        chalk.gray(
          'Use "mcpkit registry add" to add servers to your registry first.',
        ),
      );
      return;
    }

    // Check if .mcp.json already exists
    const configExists = projectConfigExists();
    let shouldProceed = true;
    let shouldMerge = false;

    if (configExists) {
      const action = await confirm({
        message:
          ".mcp.json already exists. Do you want to merge with existing servers?",
        default: true,
      });

      if (action) {
        shouldMerge = true;
      } else {
        const shouldOverwrite = await confirm({
          message: "Overwrite existing .mcp.json?",
          default: false,
        });

        if (!shouldOverwrite) {
          console.log(chalk.yellow("Cancelled."));
          return;
        }
        shouldMerge = false;
      }
    }

    // Present multi-select checkbox interface
    console.log(chalk.blue("\nSelect MCP Servers for .mcp.json file:"));
    console.log(
      chalk.gray(
        "(Use ↑/↓ to navigate, space to select/deselect, enter to confirm)\n",
      ),
    );

    const selectedServers = await checkbox({
      message: "Choose servers:",
      choices: serverNames.map((name) => ({
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

    // Build the project config
    let projectConfig: ProjectConfig;

    if (shouldMerge && configExists) {
      // Merge with existing config
      projectConfig = await readProjectConfig();
    } else {
      // Create new config
      projectConfig = { mcpServers: {} };
    }

    // Add selected servers
    selectedServers.forEach((serverName) => {
      projectConfig.mcpServers[serverName] = registry.servers[serverName];
    });

    // Write to .mcp.json
    await writeProjectConfig(projectConfig);

    console.log(
      chalk.green(
        `\n✓ Created .mcp.json with ${selectedServers.length} server${selectedServers.length === 1 ? "" : "s"}`,
      ),
    );
    console.log(chalk.gray("Selected servers:"));
    selectedServers.forEach((name) => {
      console.log(chalk.gray(`  • ${name}`));
    });
  } catch (error) {
    throw error;
  }
}
