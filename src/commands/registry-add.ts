import { editor, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import {
  addServerToRegistry,
  serverExistsInRegistry,
} from "../utils/registry.js";
import {
  addServerToCodexRegistry,
  serverExistsInCodexRegistry,
} from "../utils/codex-config.js";
import {
  addServerToOpenCodeRegistry,
  serverExistsInOpenCodeRegistry,
} from "../utils/opencode-config.js";
import {
  parseCodexServerInput,
  parseOpenCodeServerInput,
  parseServerInput,
} from "../utils/validation.js";
import type { TargetOptions } from "../utils/targets.js";
import { resolveSingleRegistryTarget } from "./registry-targets.js";

/**
 * Command handler for 'mcpkit registry add'
 */
export async function registryAddCommand(options: TargetOptions): Promise<void> {
  try {
    const target = await resolveSingleRegistryTarget(options);

    if (!target) {
      console.log(chalk.yellow("No registry target selected. Cancelled."));
      return;
    }

    console.log(chalk.blue("Opening editor for MCP server configuration..."));
    console.log();
    console.log(chalk.gray("Instructions:"));
    console.log(
      chalk.gray(
        target === "claude"
          ? "  1. Paste your multi-line JSON configuration"
          : target === "codex"
            ? "  1. Paste your single Codex TOML [mcp_servers.<name>] configuration"
            : "  1. Paste your single OpenCode JSON server entry",
      ),
    );
    console.log(
      chalk.gray("  2. Save and exit (vim: :wq | nano: Ctrl+O then Ctrl+X)"),
    );
    console.log();
    console.log(chalk.gray("Example formats:"));

    if (target === "claude") {
      console.log(chalk.gray("Stdio server:"));
      console.log(chalk.gray('  "playwright": {'));
      console.log(chalk.gray('    "command": "npx",'));
      console.log(chalk.gray('    "args": ["@playwright/mcp@latest"]'));
      console.log(chalk.gray("  }"));
      console.log(chalk.gray("Streaming server:"));
      console.log(chalk.gray('  "context7": {'));
      console.log(chalk.gray('    "url": "https://api.context7.ai/mcp"'));
      console.log(chalk.gray("  }"));
    } else if (target === "codex") {
      console.log(chalk.gray("[mcp_servers.context7]"));
      console.log(chalk.gray('command = "npx"'));
      console.log(chalk.gray('args = ["-y", "@upstash/context7-mcp@latest"]'));
    } else {
      console.log(chalk.gray('  "context7": {'));
      console.log(chalk.gray('    "type": "remote",'));
      console.log(chalk.gray('    "url": "https://mcp.context7.com/mcp",'));
      console.log(chalk.gray('    "headers": {'));
      console.log(chalk.gray('      "CONTEXT7_API_KEY": "${CONTEXT_7_KEY}"'));
      console.log(chalk.gray('    }'));
      console.log(chalk.gray('  }'));
    }

    console.log();

    const pastedInput = await editor({
      message:
        target === "claude"
          ? "Enter server configuration (paste JSON and save):"
          : target === "codex"
            ? "Enter Codex server configuration (paste TOML and save):"
            : "Enter OpenCode server configuration (paste JSON and save):",
      default: "",
      validate: (value) => {
        if (!value.trim()) {
          return "Please provide a server configuration";
        }
        try {
          if (target === "claude") {
            parseServerInput(value);
          } else if (target === "codex") {
            parseCodexServerInput(value);
          } else {
            parseOpenCodeServerInput(value);
          }
          return true;
        } catch (error) {
          return error instanceof Error
            ? error.message
            : "Invalid configuration";
        }
      },
    });

    if (target === "claude") {
      const { name, config } = parseServerInput(pastedInput);
      const exists = await serverExistsInRegistry(name);

      if (exists) {
        const shouldOverwrite = await confirm({
          message: `Server "${name}" already exists in Claude registry. Overwrite?`,
          default: false,
        });

        if (!shouldOverwrite) {
          console.log(chalk.yellow("Cancelled."));
          return;
        }
      }

      await addServerToRegistry(name, config);
      console.log(
        chalk.green(`✓ Added "${name}" to Claude registry (~/.mcpkit/mcp-servers.json)`),
      );
      return;
    }

    if (target === "codex") {
      const { name, config } = parseCodexServerInput(pastedInput);
      const exists = await serverExistsInCodexRegistry(name);

      if (exists) {
        const shouldOverwrite = await confirm({
          message: `Server "${name}" already exists in Codex registry. Overwrite?`,
          default: false,
        });

        if (!shouldOverwrite) {
          console.log(chalk.yellow("Cancelled."));
          return;
        }
      }

      await addServerToCodexRegistry(name, config);
      console.log(
        chalk.green(
          `✓ Added "${name}" to Codex registry (~/.mcpkit/codex-mcp-servers.toml)`,
        ),
      );
      return;
    }

    const { name, config } = parseOpenCodeServerInput(pastedInput);
    const exists = await serverExistsInOpenCodeRegistry(name);

    if (exists) {
      const shouldOverwrite = await confirm({
        message: `Server "${name}" already exists in OpenCode registry. Overwrite?`,
        default: false,
      });

      if (!shouldOverwrite) {
        console.log(chalk.yellow("Cancelled."));
        return;
      }
    }

    await addServerToOpenCodeRegistry(name, config);
    console.log(
      chalk.green(
        `✓ Added "${name}" to OpenCode registry (~/.mcpkit/opencode-mcp-servers.json)`,
      ),
    );
  } catch (error) {
    throw error;
  }
}
