import { checkbox, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { removeServerFromRegistry, readRegistry } from "../utils/registry.js";
import {
  removeServerFromCodexRegistry,
  readCodexRegistry,
  ensureCodexMcpServers,
} from "../utils/codex-config.js";
import type { TargetOptions } from "../utils/targets.js";
import { resolveSingleRegistryTarget } from "./registry-targets.js";

/**
 * Command handler for 'mcpkit registry remove'
 */
export async function registryRemoveCommand(options: TargetOptions): Promise<void> {
  try {
    const target = await resolveSingleRegistryTarget(options);

    if (!target) {
      console.log(chalk.yellow("No registry target selected. Cancelled."));
      return;
    }

    const serverNames =
      target === "claude"
        ? Object.keys((await readRegistry()).servers).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
        : Object.keys(ensureCodexMcpServers(await readCodexRegistry())).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    if (serverNames.length === 0) {
      console.log(
        chalk.yellow(
          target === "claude"
            ? "No MCP servers found in Claude registry"
            : "No MCP servers found in Codex registry",
        ),
      );
      return;
    }

    console.log(
      chalk.blue(
        target === "claude"
          ? "\nSelect Claude Code MCP servers to remove from registry:"
          : "\nSelect Codex CLI MCP servers to remove from registry:",
      ),
    );
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
      message: `Are you sure you want to remove ${serversToRemove.length} server(s) from the ${target === "claude" ? "Claude" : "Codex"} registry?`,
      default: false,
    });

    if (!confirmed) {
      console.log(chalk.yellow("Cancelled."));
      return;
    }

    for (const serverName of serversToRemove) {
      if (target === "claude") {
        await removeServerFromRegistry(serverName);
        console.log(
          chalk.green(
            `✓ Removed "${serverName}" from Claude registry (~/.mcpkit/mcp-servers.json)`,
          ),
        );
      } else {
        await removeServerFromCodexRegistry(serverName);
        console.log(
          chalk.green(
            `✓ Removed "${serverName}" from Codex registry (~/.mcpkit/codex-mcp-servers.toml)`,
          ),
        );
      }
    }
  } catch (error) {
    throw error;
  }
}
