import chalk from 'chalk';
import { readRegistry } from '../utils/registry.js';
import { readCodexRegistry, ensureCodexMcpServers } from '../utils/codex-config.js';
import { ensureOpenCodeMcpServers, readOpenCodeRegistry } from '../utils/opencode-config.js';
import { ensureGeminiMcpServers, readGeminiRegistry } from '../utils/gemini-config.js';
import { ensureCursorMcpServers, readCursorRegistry } from '../utils/cursor-config.js';
import { getExplicitTargets, type TargetOptions } from '../utils/targets.js';

interface RegistryListCommandOptions extends TargetOptions {
  verbose?: boolean;
}

function renderJsonConfig(config: unknown): string {
  return JSON.stringify(config, null, 4).replace(/\n/g, '\n    ');
}

function renderClaudeRegistry(
  serverNames: string[],
  registry: Awaited<ReturnType<typeof readRegistry>>,
  verbose?: boolean,
): void {
  console.log(chalk.blue('Claude Code Registry (~/.mcpkit/mcp-servers.json):'));

  if (serverNames.length === 0) {
    console.log(chalk.yellow('  No MCP servers configured'));
    return;
  }

  if (verbose) {
    serverNames.forEach((name) => {
      console.log(chalk.green(`\n  • ${name}`));
      console.log(chalk.gray(`    ${renderJsonConfig(registry.servers[name])}`));
    });
  } else {
    serverNames.forEach((name) => {
      console.log(chalk.green(`  • ${name}`));
    });
  }

  console.log(chalk.gray(`Total: ${serverNames.length} server${serverNames.length === 1 ? '' : 's'}`));
}

function renderCodexRegistry(
  serverNames: string[],
  registry: Awaited<ReturnType<typeof readCodexRegistry>>,
  verbose?: boolean,
): void {
  console.log(chalk.blue('Codex CLI Registry (~/.mcpkit/codex-mcp-servers.toml):'));

  if (serverNames.length === 0) {
    console.log(chalk.yellow('  No MCP servers configured'));
    return;
  }

  const servers = ensureCodexMcpServers(registry);

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

function renderOpenCodeRegistry(
  serverNames: string[],
  registry: Awaited<ReturnType<typeof readOpenCodeRegistry>>,
  verbose?: boolean,
): void {
  console.log(chalk.blue('OpenCode CLI Registry (~/.mcpkit/opencode-mcp-servers.json):'));

  if (serverNames.length === 0) {
    console.log(chalk.yellow('  No MCP servers configured'));
    return;
  }

  const servers = ensureOpenCodeMcpServers(registry);

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

function renderGeminiRegistry(
  serverNames: string[],
  registry: Awaited<ReturnType<typeof readGeminiRegistry>>,
  verbose?: boolean,
): void {
  console.log(chalk.blue('Gemini CLI Registry (~/.mcpkit/gemini-mcp-servers.json):'));

  if (serverNames.length === 0) {
    console.log(chalk.yellow('  No MCP servers configured'));
    return;
  }

  const servers = ensureGeminiMcpServers(registry);

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

function renderCursorRegistry(
  serverNames: string[],
  registry: Awaited<ReturnType<typeof readCursorRegistry>>,
  verbose?: boolean,
): void {
  console.log(chalk.blue('Cursor Registry (~/.mcpkit/cursor-mcp-servers.json):'));

  if (serverNames.length === 0) {
    console.log(chalk.yellow('  No MCP servers configured'));
    return;
  }

  const servers = ensureCursorMcpServers(registry);

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
 * Command handler for 'mcpkit registry list'
 */
export async function registryListCommand(options: RegistryListCommandOptions): Promise<void> {
  try {
    const explicitTargets = getExplicitTargets(options);
    const showClaude = explicitTargets.length === 0 || explicitTargets.includes('claude');
    const showCodex = explicitTargets.length === 0 || explicitTargets.includes('codex');
    const showOpenCode = explicitTargets.length === 0 || explicitTargets.includes('opencode');
    const showGemini = explicitTargets.length === 0 || explicitTargets.includes('gemini');
    const showCursor = explicitTargets.length === 0 || explicitTargets.includes('cursor');

    if (showClaude) {
      const registry = await readRegistry();
      renderClaudeRegistry(Object.keys(registry.servers).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })), registry, options.verbose);
    }

    if (showClaude && showCodex) {
      console.log();
    }

    if (showCodex) {
      const registry = await readCodexRegistry();
      renderCodexRegistry(
        Object.keys(ensureCodexMcpServers(registry)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
        registry,
        options.verbose,
      );
    }

    if ((showClaude || showCodex) && showOpenCode) {
      console.log();
    }

    if (showOpenCode) {
      const registry = await readOpenCodeRegistry();
      renderOpenCodeRegistry(
        Object.keys(ensureOpenCodeMcpServers(registry)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
        registry,
        options.verbose,
      );
    }

    if ((showClaude || showCodex || showOpenCode) && showGemini) {
      console.log();
    }

    if (showGemini) {
      const registry = await readGeminiRegistry();
      renderGeminiRegistry(
        Object.keys(ensureGeminiMcpServers(registry)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
        registry,
        options.verbose,
      );
    }

    if ((showClaude || showCodex || showOpenCode || showGemini) && showCursor) {
      console.log();
    }

    if (showCursor) {
      const registry = await readCursorRegistry();
      renderCursorRegistry(
        Object.keys(ensureCursorMcpServers(registry)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
        registry,
        options.verbose,
      );
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
