import chalk from 'chalk';
import { existsSync } from 'node:fs';
import type { TargetOptions } from '../utils/targets.js';
import { getProjectHookFileLabel } from '../utils/hook-apply.js';
import { getExplicitHookTargets, throwIfOpenCode, type HookTarget } from './hook-targets.js';
import { readClaudeHookRegistry, readClaudeProjectHooks } from '../utils/claude-hooks.js';
import { readCodexHookRegistry, readCodexProjectHooks } from '../utils/codex-hooks.js';
import { readAgyHookRegistry, readAgyProjectHooks } from '../utils/agy-hooks.js';
import { readCursorHookRegistry, readCursorProjectHooks } from '../utils/cursor-hooks.js';
import { codexProjectConfigExists } from '../utils/codex-config.js';
import {
  getAgyHooksProjectPath,
  getClaudeProjectSettingsPath,
  getCursorHooksProjectPath,
} from '../utils/paths.js';

interface HooksListOptions extends TargetOptions {
  registry?: boolean;
}

interface HookPlatformView {
  target: HookTarget;
  header: string;
  projectExists: () => boolean;
  readProjectEntryIds: () => Promise<string[]>;
  readRegistryEntryIds: () => Promise<string[]>;
}

const sortedEntryIds = (ids: string[]): string[] =>
  ids.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

const REGISTRY_LABELS: Record<HookTarget, string> = {
  claude: '~/.mcpkit/claude-hooks.json',
  codex: '~/.mcpkit/codex-hooks.toml',
  agy: '~/.mcpkit/agy-hooks.json',
  cursor: '~/.mcpkit/cursor-hooks.json',
};

const PLATFORM_VIEWS: HookPlatformView[] = [
  {
    target: 'claude',
    header: 'Claude Code Hooks',
    projectExists: () => existsSync(getClaudeProjectSettingsPath()),
    readProjectEntryIds: async () => Object.keys(await readClaudeProjectHooks()),
    readRegistryEntryIds: async () => Object.keys((await readClaudeHookRegistry()).hooks),
  },
  {
    target: 'codex',
    header: 'Codex CLI Hooks',
    projectExists: () => codexProjectConfigExists(),
    readProjectEntryIds: async () => Object.keys(await readCodexProjectHooks()),
    readRegistryEntryIds: async () => Object.keys((await readCodexHookRegistry()).hooks),
  },
  {
    target: 'agy',
    header: 'Antigravity CLI Hooks',
    projectExists: () => existsSync(getAgyHooksProjectPath()),
    readProjectEntryIds: async () => Object.keys(await readAgyProjectHooks()),
    readRegistryEntryIds: async () => Object.keys(await readAgyHookRegistry()),
  },
  {
    target: 'cursor',
    header: 'Cursor Hooks',
    projectExists: () => existsSync(getCursorHooksProjectPath()),
    readProjectEntryIds: async () => Object.keys((await readCursorProjectHooks()).hooks ?? {}),
    readRegistryEntryIds: async () => Object.keys((await readCursorHookRegistry()).hooks ?? {}),
  },
];

function renderSection(
  view: HookPlatformView,
  entryIds: string[],
  mode: 'project' | 'registry',
  configured: boolean,
): void {
  const fileLabel =
    mode === 'registry' ? REGISTRY_LABELS[view.target] : getProjectHookFileLabel(view.target);
  console.log(chalk.blue(`${view.header} (${fileLabel}):`));

  if (!configured) {
    console.log(chalk.yellow('  Not configured'));
    return;
  }

  if (entryIds.length === 0) {
    console.log(chalk.yellow(mode === 'project' ? '  No hooks applied to this project' : '  No hooks saved'));
    return;
  }

  for (const id of entryIds) {
    console.log(chalk.green(`  • ${id}`));
  }

  console.log(
    chalk.gray(`Total: ${entryIds.length} hook${entryIds.length === 1 ? '' : 's'}`),
  );
}

/**
 * Command handler for 'mcpkit hooks list'
 */
export async function hooksListCommand(options: HooksListOptions): Promise<void> {
  try {
    throwIfOpenCode(options);

    const explicitTargets = getExplicitHookTargets(options);
    const showAll = explicitTargets.length === 0;
    let previousShown = false;

    for (const view of PLATFORM_VIEWS) {
      if (!showAll && !explicitTargets.includes(view.target)) {
        continue;
      }

      if (previousShown) {
        console.log();
      }
      previousShown = true;

      if (options.registry) {
        const entryIds = sortedEntryIds(await view.readRegistryEntryIds());
        renderSection(view, entryIds, 'registry', true);
      } else {
        const configured = view.projectExists();
        const entryIds = configured ? sortedEntryIds(await view.readProjectEntryIds()) : [];
        renderSection(view, entryIds, 'project', configured);
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