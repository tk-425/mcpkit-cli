import chalk from 'chalk';
import { readProjectConfig, projectConfigExists } from '../utils/project-config.js';
import {
  readCodexProjectConfig,
  codexProjectConfigExists,
  ensureCodexMcpServers,
} from '../utils/codex-config.js';
import {
  ensureOpenCodeMcpServers,
  openCodeProjectConfigExists,
  readOpenCodeProjectConfig,
} from '../utils/opencode-config.js';
import {
  ensureGeminiMcpServers,
  geminiProjectConfigExists,
  readGeminiProjectConfig,
} from '../utils/gemini-config.js';
import {
  ensureCursorMcpServers,
  cursorProjectConfigExists,
  readCursorProjectConfig,
} from '../utils/cursor-config.js';
import { getExplicitTargets, type TargetOptions } from '../utils/targets.js';

interface ListCommandOptions extends TargetOptions {
  verbose?: boolean;
}

function renderJsonConfig(config: unknown): string {
  return JSON.stringify(config, null, 4).replace(/\n/g, '\n    ');
}

function renderClaudeSection(
  serverNames: string[],
  projectConfig?: Awaited<ReturnType<typeof readProjectConfig>>,
  verbose?: boolean,
): void {
  console.log(chalk.blue('Claude Code Project MCP Servers (.mcp.json):'));

  if (!projectConfig) {
    console.log(chalk.yellow('  Not configured'));
    return;
  }

  if (serverNames.length === 0) {
    console.log(chalk.yellow('  No MCP servers configured'));
    return;
  }

  if (verbose) {
    serverNames.forEach((name) => {
      console.log(chalk.green(`\n  • ${name}`));
      console.log(chalk.gray(`    ${renderJsonConfig(projectConfig.mcpServers[name])}`));
    });
  } else {
    serverNames.forEach((name) => {
      console.log(chalk.green(`  • ${name}`));
    });
  }

  console.log(chalk.gray(`Total: ${serverNames.length} server${serverNames.length === 1 ? '' : 's'}`));
}

function renderCodexSection(
  serverNames: string[],
  projectConfig?: Awaited<ReturnType<typeof readCodexProjectConfig>>,
  verbose?: boolean,
): void {
  console.log(chalk.blue('Codex CLI Project MCP Servers (.codex/config.toml):'));

  if (!projectConfig) {
    console.log(chalk.yellow('  Not configured'));
    return;
  }

  if (serverNames.length === 0) {
    console.log(chalk.yellow('  No MCP servers configured'));
    return;
  }

  const servers = ensureCodexMcpServers(projectConfig);

  if (verbose) {
    serverNames.forEach((name) => {
      console.log(chalk.green(`\n  • ${name}`));
      console.log(chalk.gray(`    ${renderJsonConfig(servers[name])}`));
    });
  } else {
    serverNames.forEach((name) => {
      console.log(chalk.green(`  • ${name}`));
    });
  }

  console.log(chalk.gray(`Total: ${serverNames.length} server${serverNames.length === 1 ? '' : 's'}`));
}

function renderOpenCodeSection(
  serverNames: string[],
  projectConfig?: Awaited<ReturnType<typeof readOpenCodeProjectConfig>>,
  verbose?: boolean,
): void {
  console.log(chalk.blue('OpenCode CLI Project MCP Servers (opencode.json):'));

  if (!projectConfig) {
    console.log(chalk.yellow('  Not configured'));
    return;
  }

  if (serverNames.length === 0) {
    console.log(chalk.yellow('  No MCP servers configured'));
    return;
  }

  const servers = ensureOpenCodeMcpServers(projectConfig);

  if (verbose) {
    serverNames.forEach((name) => {
      console.log(chalk.green(`\n  • ${name}`));
      console.log(chalk.gray(`    ${renderJsonConfig(servers[name])}`));
    });
  } else {
    serverNames.forEach((name) => {
      console.log(chalk.green(`  • ${name}`));
    });
  }

  console.log(chalk.gray(`Total: ${serverNames.length} server${serverNames.length === 1 ? '' : 's'}`));
}

function renderGeminiSection(
  serverNames: string[],
  projectConfig?: Awaited<ReturnType<typeof readGeminiProjectConfig>>,
  verbose?: boolean,
): void {
  console.log(chalk.blue('Gemini CLI Project MCP Servers (.gemini/settings.json):'));

  if (!projectConfig) {
    console.log(chalk.yellow('  Not configured'));
    return;
  }

  if (serverNames.length === 0) {
    console.log(chalk.yellow('  No MCP servers configured'));
    return;
  }

  const servers = ensureGeminiMcpServers(projectConfig);

  if (verbose) {
    serverNames.forEach((name) => {
      console.log(chalk.green(`\n  • ${name}`));
      console.log(chalk.gray(`    ${renderJsonConfig(servers[name])}`));
    });
  } else {
    serverNames.forEach((name) => {
      console.log(chalk.green(`  • ${name}`));
    });
  }

  console.log(chalk.gray(`Total: ${serverNames.length} server${serverNames.length === 1 ? '' : 's'}`));
}

function renderCursorSection(
  serverNames: string[],
  projectConfig?: Awaited<ReturnType<typeof readCursorProjectConfig>>,
  verbose?: boolean,
): void {
  console.log(chalk.blue('Cursor Project MCP Servers (.cursor/mcp.json):'));

  if (!projectConfig) {
    console.log(chalk.yellow('  Not configured'));
    return;
  }

  if (serverNames.length === 0) {
    console.log(chalk.yellow('  No MCP servers configured'));
    return;
  }

  const servers = ensureCursorMcpServers(projectConfig);

  if (verbose) {
    serverNames.forEach((name) => {
      console.log(chalk.green(`\n  • ${name}`));
      console.log(chalk.gray(`    ${renderJsonConfig(servers[name])}`));
    });
  } else {
    serverNames.forEach((name) => {
      console.log(chalk.green(`  • ${name}`));
    });
  }

  console.log(chalk.gray(`Total: ${serverNames.length} server${serverNames.length === 1 ? '' : 's'}`));
}

/**
 * Command handler for 'mcpkit list'
 */
export async function listCommand(options: ListCommandOptions): Promise<void> {
  try {
    const explicitTargets = getExplicitTargets(options);
    const showClaude = explicitTargets.length === 0 || explicitTargets.includes('claude');
    const showCodex = explicitTargets.length === 0 || explicitTargets.includes('codex');
    const showOpenCode = explicitTargets.length === 0 || explicitTargets.includes('opencode');
    const showGemini = explicitTargets.length === 0 || explicitTargets.includes('gemini');
    const showCursor = explicitTargets.length === 0 || explicitTargets.includes('cursor');

    if (showClaude) {
      if (projectConfigExists()) {
        const projectConfig = await readProjectConfig();
        renderClaudeSection(
          Object.keys(projectConfig.mcpServers).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
          projectConfig,
          options.verbose,
        );
      } else {
        renderClaudeSection([], undefined, options.verbose);
      }
    }

    if (showClaude && showCodex) {
      console.log();
    }

    if (showCodex) {
      if (codexProjectConfigExists()) {
        const projectConfig = await readCodexProjectConfig();
        renderCodexSection(
          Object.keys(ensureCodexMcpServers(projectConfig)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
          projectConfig,
          options.verbose,
        );
      } else {
        renderCodexSection([], undefined, options.verbose);
      }
    }

    if ((showClaude || showCodex) && showOpenCode) {
      console.log();
    }

    if (showOpenCode) {
      if (openCodeProjectConfigExists()) {
        const projectConfig = await readOpenCodeProjectConfig();
        renderOpenCodeSection(
          Object.keys(ensureOpenCodeMcpServers(projectConfig)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
          projectConfig,
          options.verbose,
        );
      } else {
        renderOpenCodeSection([], undefined, options.verbose);
      }
    }

    if ((showClaude || showCodex || showOpenCode) && showGemini) {
      console.log();
    }

    if (showGemini) {
      if (geminiProjectConfigExists()) {
        const projectConfig = await readGeminiProjectConfig();
        renderGeminiSection(
          Object.keys(ensureGeminiMcpServers(projectConfig)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
          projectConfig,
          options.verbose,
        );
      } else {
        renderGeminiSection([], undefined, options.verbose);
      }
    }

    if ((showClaude || showCodex || showOpenCode || showGemini) && showCursor) {
      console.log();
    }

    if (showCursor) {
      if (cursorProjectConfigExists()) {
        const projectConfig = await readCursorProjectConfig();
        renderCursorSection(
          Object.keys(ensureCursorMcpServers(projectConfig)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
          projectConfig,
          options.verbose,
        );
      } else {
        renderCursorSection([], undefined, options.verbose);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red(`Error: ${error.message}`));
    } else {
      console.error(chalk.red('An unexpected error occurred'));
    }
    process.exit(1);
  }
}
