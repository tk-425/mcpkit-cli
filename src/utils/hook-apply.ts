import {
  readClaudeHookRegistry,
  readClaudeProjectHooks,
  writeClaudeProjectHooks,
  type ClaudeHooks,
  type ClaudeHooksRegistry,
  type ClaudeMatcherGroup,
} from './claude-hooks.js';
import {
  readCodexHookRegistry,
  readCodexProjectHooks,
  writeCodexProjectHooks,
  type CodexHooks,
  type CodexHooksRegistry,
  type CodexMatcherGroup,
} from './codex-hooks.js';
import {
  readAgyHookRegistry,
  readAgyProjectHooks,
  writeAgyProjectHooks,
  type AgyHooks,
  type AgyNamedGroup,
} from './agy-hooks.js';
import {
  readCursorHookRegistry,
  readCursorProjectHooks,
  writeCursorProjectHooks,
  type CursorHookFile,
  type CursorHookHandler,
} from './cursor-hooks.js';

export type HookTarget = 'claude' | 'codex' | 'agy' | 'cursor';

export interface ApplyEntrySummary {
  id: string;
  status: 'added' | 'refreshed';
}

export interface ApplySummary {
  target: HookTarget;
  fileLabel: string;
  entries: ApplyEntrySummary[];
}

export interface RemoveEntrySummary {
  id: string;
  status: 'removed' | 'not-found';
}

export interface RemoveSummary {
  target: HookTarget;
  fileLabel: string;
  entries: RemoveEntrySummary[];
}

const TARGET_FILE_LABELS: Record<HookTarget, string> = {
  claude: '.claude/settings.json',
  codex: '.codex/config.toml',
  agy: '.agents/hooks.json',
  cursor: '.cursor/hooks.json',
};

export function getProjectHookFileLabel(target: HookTarget): string {
  return TARGET_FILE_LABELS[target];
}

interface HookStoreAdapter<TRegistry, TProject, TEntry> {
  fileLabel: string;
  platform: string;
  readRegistry: () => Promise<TRegistry>;
  getRegistryEntry: (registry: TRegistry, id: string) => TEntry | undefined;
  readProject: () => Promise<TProject>;
  getProjectEntry: (project: TProject, id: string) => TEntry | undefined;
  setProjectEntry: (project: TProject, id: string, entry: TEntry) => void;
  removeProjectEntry: (project: TProject, id: string) => void;
  writeProject: (project: TProject) => Promise<void>;
}

const CLAUDE_ADAPTER: HookStoreAdapter<ClaudeHooksRegistry, ClaudeHooks, ClaudeMatcherGroup[]> = {
  fileLabel: TARGET_FILE_LABELS.claude,
  platform: 'Claude',
  readRegistry: readClaudeHookRegistry,
  getRegistryEntry: (registry, id) => registry.hooks[id],
  readProject: readClaudeProjectHooks,
  getProjectEntry: (project, id) => project[id],
  setProjectEntry: (project, id, entry) => {
    project[id] = entry;
  },
  removeProjectEntry: (project, id) => {
    delete project[id];
  },
  writeProject: writeClaudeProjectHooks,
};

const CODEX_ADAPTER: HookStoreAdapter<CodexHooksRegistry, CodexHooks, CodexMatcherGroup[]> = {
  fileLabel: TARGET_FILE_LABELS.codex,
  platform: 'Codex',
  readRegistry: readCodexHookRegistry,
  getRegistryEntry: (registry, id) => registry.hooks[id],
  readProject: readCodexProjectHooks,
  getProjectEntry: (project, id) => project[id],
  setProjectEntry: (project, id, entry) => {
    project[id] = entry;
  },
  removeProjectEntry: (project, id) => {
    delete project[id];
  },
  writeProject: writeCodexProjectHooks,
};

const AGY_ADAPTER: HookStoreAdapter<AgyHooks, AgyHooks, AgyNamedGroup> = {
  fileLabel: TARGET_FILE_LABELS.agy,
  platform: 'Antigravity',
  readRegistry: readAgyHookRegistry,
  getRegistryEntry: (registry, id) => registry[id],
  readProject: readAgyProjectHooks,
  getProjectEntry: (project, id) => project[id],
  setProjectEntry: (project, id, entry) => {
    project[id] = entry;
  },
  removeProjectEntry: (project, id) => {
    delete project[id];
  },
  writeProject: writeAgyProjectHooks,
};

const CURSOR_ADAPTER: HookStoreAdapter<CursorHookFile, CursorHookFile, CursorHookHandler[]> = {
  fileLabel: TARGET_FILE_LABELS.cursor,
  platform: 'Cursor',
  readRegistry: readCursorHookRegistry,
  getRegistryEntry: (file, id) => file.hooks?.[id],
  readProject: readCursorProjectHooks,
  getProjectEntry: (file, id) => file.hooks?.[id],
  setProjectEntry: (file, id, entry) => {
    (file.hooks ??= {})[id] = entry;
  },
  removeProjectEntry: (file, id) => {
    delete file.hooks?.[id];
  },
  writeProject: (file) => writeCursorProjectHooks(file.hooks ?? {}),
};

async function applyEntries<TRegistry, TProject, TEntry>(
  adapter: HookStoreAdapter<TRegistry, TProject, TEntry>,
  target: HookTarget,
  selectedIds: string[],
): Promise<ApplySummary> {
  const registry = await adapter.readRegistry();
  const project = await adapter.readProject();
  const entries: ApplyEntrySummary[] = [];

  for (const id of selectedIds) {
    const content = adapter.getRegistryEntry(registry, id);
    if (content === undefined) {
      throw new Error(`Entry "${id}" is not in the ${adapter.platform} hook registry`);
    }
    entries.push({
      id,
      status: adapter.getProjectEntry(project, id) === undefined ? 'added' : 'refreshed',
    });
    adapter.setProjectEntry(project, id, content);
  }

  await adapter.writeProject(project);
  return { target, fileLabel: adapter.fileLabel, entries };
}

/**
 * Merge selected hook registry entries into the target project hook file.
 * Additive by entry identity: unselected entries and every other key are preserved.
 */
export async function applyHookEntries(
  target: HookTarget,
  selectedIds: string[],
): Promise<ApplySummary> {
  switch (target) {
    case 'claude':
      return applyEntries(CLAUDE_ADAPTER, target, selectedIds);
    case 'codex':
      return applyEntries(CODEX_ADAPTER, target, selectedIds);
    case 'agy':
      return applyEntries(AGY_ADAPTER, target, selectedIds);
    case 'cursor':
      return applyEntries(CURSOR_ADAPTER, target, selectedIds);
  }
}

async function removeEntries<TRegistry, TProject, TEntry>(
  adapter: HookStoreAdapter<TRegistry, TProject, TEntry>,
  target: HookTarget,
  selectedIds: string[],
): Promise<RemoveSummary> {
  const project = await adapter.readProject();
  const entries: RemoveEntrySummary[] = [];
  let removedAny = false;

  for (const id of selectedIds) {
    if (adapter.getProjectEntry(project, id) !== undefined) {
      adapter.removeProjectEntry(project, id);
      removedAny = true;
      entries.push({ id, status: 'removed' });
    } else {
      entries.push({ id, status: 'not-found' });
    }
  }

  if (removedAny) {
    await adapter.writeProject(project);
  }

  return { target, fileLabel: adapter.fileLabel, entries };
}

/**
 * Remove selected entries from the target project hook file only;
 * the hook registry is never modified by this module.
 */
export async function removeHookEntries(
  target: HookTarget,
  selectedIds: string[],
): Promise<RemoveSummary> {
  switch (target) {
    case 'claude':
      return removeEntries(CLAUDE_ADAPTER, target, selectedIds);
    case 'codex':
      return removeEntries(CODEX_ADAPTER, target, selectedIds);
    case 'agy':
      return removeEntries(AGY_ADAPTER, target, selectedIds);
    case 'cursor':
      return removeEntries(CURSOR_ADAPTER, target, selectedIds);
  }
}