import chalk from 'chalk';
import { readRegistry } from '../utils/registry.js';
import { readCodexRegistry, ensureCodexMcpServers } from '../utils/codex-config.js';
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

/**
 * Command handler for 'mcpkit registry list'
 */
export async function registryListCommand(options: RegistryListCommandOptions): Promise<void> {
  try {
    const explicitTargets = getExplicitTargets(options);
    const showClaude = explicitTargets.length === 0 || explicitTargets.includes('claude');
    const showCodex = explicitTargets.length === 0 || explicitTargets.includes('codex');

    if (showClaude) {
      const registry = await readRegistry();
      renderClaudeRegistry(Object.keys(registry.servers), registry, options.verbose);
    }

    if (showClaude && showCodex) {
      console.log();
    }

    if (showCodex) {
      const registry = await readCodexRegistry();
      renderCodexRegistry(
        Object.keys(ensureCodexMcpServers(registry)),
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
