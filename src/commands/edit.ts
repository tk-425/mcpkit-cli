import { editor, confirm } from "@inquirer/prompts";
import chalk from "chalk";
import {
  addServerToProject,
  serverExistsInProject,
} from "../utils/project-config.js";
import {
  addServerToCodexProject,
  serverExistsInCodexProject,
} from "../utils/codex-config.js";
import { parseCodexServerInput, parseServerInput } from "../utils/validation.js";
import type { TargetOptions } from "../utils/targets.js";
import { resolveSingleTarget } from "./single-target.js";

/**
 * Command handler for 'mcpkit edit'
 */
export async function editCommand(options: TargetOptions): Promise<void> {
  try {
    const target = await resolveSingleTarget(options, "Choose project target:");

    if (!target) {
      console.log(chalk.yellow("No target selected. Cancelled."));
      return;
    }

    console.log(chalk.blue("Opening editor for MCP server configuration..."));
    console.log();
    console.log(chalk.gray("Instructions:"));
    console.log(
      chalk.gray(
        target === "claude"
          ? "  1. Paste or edit your multi-line JSON configuration"
          : "  1. Paste or edit your single Codex TOML [mcp_servers.<name>] configuration",
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
    } else {
      console.log(chalk.gray("[mcp_servers.context7]"));
      console.log(chalk.gray('command = "npx"'));
      console.log(chalk.gray('args = ["-y", "@upstash/context7-mcp@latest"]'));
    }

    console.log();

    const pastedInput = await editor({
      message:
        target === "claude"
          ? "Enter server configuration (paste JSON and save):"
          : "Enter Codex server configuration (paste TOML and save):",
      default: "",
      validate: (value) => {
        if (!value.trim()) {
          return "Please provide a server configuration";
        }
        try {
          if (target === "claude") {
            parseServerInput(value);
          } else {
            parseCodexServerInput(value);
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
      const exists = await serverExistsInProject(name);

      if (exists) {
        const shouldOverwrite = await confirm({
          message: `Server "${name}" already exists in .mcp.json. Overwrite?`,
          default: false,
        });

        if (!shouldOverwrite) {
          console.log(chalk.yellow("Cancelled."));
          return;
        }
      }

      await addServerToProject(name, config);
      console.log(chalk.green(`✓ Updated "${name}" in .mcp.json`));
      return;
    }

    const { name, config } = parseCodexServerInput(pastedInput);
    const exists = await serverExistsInCodexProject(name);

    if (exists) {
      const shouldOverwrite = await confirm({
        message: `Server "${name}" already exists in .codex/config.toml. Overwrite?`,
        default: false,
      });

      if (!shouldOverwrite) {
        console.log(chalk.yellow("Cancelled."));
        return;
      }
    }

    await addServerToCodexProject(name, config);
    console.log(chalk.green(`✓ Updated "${name}" in .codex/config.toml`));
  } catch (error) {
    throw error;
  }
}
