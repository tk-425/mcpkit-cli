import { checkbox, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import { removeServerFromRegistry, readRegistry } from "../utils/registry.js";
import {
  removeServerFromCodexRegistry,
  readCodexRegistry,
  ensureCodexMcpServers,
} from "../utils/codex-config.js";
import {
  ensureOpenCodeMcpServers,
  readOpenCodeRegistry,
  removeServerFromOpenCodeRegistry,
} from "../utils/opencode-config.js";
import {
  ensureGeminiMcpServers,
  readGeminiRegistry,
  removeServerFromGeminiRegistry,
} from "../utils/gemini-config.js";
import {
  ensureCursorMcpServers,
  readCursorRegistry,
  removeServerFromCursorRegistry,
} from "../utils/cursor-config.js";
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

    const serverNames = target === "claude"
      ? Object.keys((await readRegistry()).servers).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      : target === "codex"
        ? Object.keys(ensureCodexMcpServers(await readCodexRegistry())).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
        : target === "opencode"
          ? Object.keys(ensureOpenCodeMcpServers(await readOpenCodeRegistry())).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
          : target === "gemini"
            ? Object.keys(ensureGeminiMcpServers(await readGeminiRegistry())).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
            : Object.keys(ensureCursorMcpServers(await readCursorRegistry())).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    if (serverNames.length === 0) {
      console.log(
        chalk.yellow(
          target === "claude"
            ? "No MCP servers found in Claude registry"
            : target === "codex"
              ? "No MCP servers found in Codex registry"
              : target === "opencode"
                ? "No MCP servers found in OpenCode registry"
                : target === "gemini"
                  ? "No MCP servers found in Gemini registry"
                  : "No MCP servers found in Cursor registry",
        ),
      );
      return;
    }

    console.log(
      chalk.blue(
        target === "claude"
          ? "\nSelect Claude Code MCP servers to remove from registry:"
          : target === "codex"
            ? "\nSelect Codex CLI MCP servers to remove from registry:"
            : target === "opencode"
              ? "\nSelect OpenCode CLI MCP servers to remove from registry:"
              : target === "gemini"
                ? "\nSelect Gemini CLI MCP servers to remove from registry:"
                : "\nSelect Cursor MCP servers to remove from registry:",
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
      message: `Are you sure you want to remove ${serversToRemove.length} server(s) from the ${target === "claude" ? "Claude" : target === "codex" ? "Codex" : target === "opencode" ? "OpenCode" : target === "gemini" ? "Gemini" : "Cursor"} registry?`,
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
      } else if (target === "codex") {
        await removeServerFromCodexRegistry(serverName);
        console.log(
          chalk.green(
            `✓ Removed "${serverName}" from Codex registry (~/.mcpkit/codex-mcp-servers.toml)`,
          ),
        );
      } else if (target === "opencode") {
        await removeServerFromOpenCodeRegistry(serverName);
        console.log(
          chalk.green(
            `✓ Removed "${serverName}" from OpenCode registry (~/.mcpkit/opencode-mcp-servers.json)`,
          ),
        );
      } else if (target === "gemini") {
        await removeServerFromGeminiRegistry(serverName);
        console.log(
          chalk.green(
            `✓ Removed "${serverName}" from Gemini registry (~/.mcpkit/gemini-mcp-servers.json)`,
          ),
        );
      } else {
        await removeServerFromCursorRegistry(serverName);
        console.log(
          chalk.green(
            `✓ Removed "${serverName}" from Cursor registry (~/.mcpkit/cursor-mcp-servers.json)`,
          ),
        );
      }
    }
  } catch (error) {
    throw error;
  }
}
