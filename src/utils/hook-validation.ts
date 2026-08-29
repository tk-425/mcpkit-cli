import type { ClaudeMatcherGroup } from './claude-hooks.js';
import { parseJSON } from './validation.js';
import { serverExistsInRegistry } from './registry.js';
import { parseToml } from './toml.js';
import { serverExistsInCodexRegistry } from './codex-config.js';

/**
 * Claude Code hook events pinned from the official hooks reference
 * (https://code.claude.com/docs/en/hooks).
 */
export const CLAUDE_HOOK_EVENTS = [
  'SessionStart',
  'SessionEnd',
  'Setup',
  'UserPromptSubmit',
  'UserPromptExpansion',
  'Stop',
  'StopFailure',
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'PostToolBatch',
  'PermissionRequest',
  'PermissionDenied',
  'SubagentStart',
  'SubagentStop',
  'TaskCreated',
  'TaskCompleted',
  'PreCompact',
  'PostCompact',
  'Notification',
  'MessageDisplay',
  'InstructionsLoaded',
  'ConfigChange',
  'CwdChanged',
  'FileChanged',
  'DirectoryAdded',
  'WorktreeCreate',
  'WorktreeRemove',
  'TeammateIdle',
  'Elicitation',
  'ElicitationResult',
] as const;

export interface ClaudeHookEntry {
  entryId: string;
  matcherGroups: ClaudeMatcherGroup[];
}

/**
 * Codex CLI hook events pinned from the official hooks reference
 * (https://developers.openai.com/codex/hooks).
 */
export const CODEX_HOOK_EVENTS = [
  'SessionStart',
  'SessionEnd',
  'SubagentStart',
  'SubagentStop',
  'PreToolUse',
  'PermissionRequest',
  'PostToolUse',
  'PreCompact',
  'PostCompact',
  'UserPromptSubmit',
  'Stop',
] as const;

export interface CodexHookHandler {
  type: string;
  command?: string;
  server?: string;
  tool?: string;
  input?: Record<string, unknown>;
  async?: boolean;
  timeout?: number;
  [key: string]: unknown;
}

export interface CodexMatcherGroup {
  matcher?: string;
  hooks: CodexHookHandler[];
  async?: boolean;
  [key: string]: unknown;
}

/**
 * Parse one pasted Codex hook entry — one event's inline hook tables.
 * Expects exactly one `hooks.<Event>` entry; rejects multi-event or non-hooks fragments.
 */
export function parseCodexHookEntry(input: string): {
  entryId: string;
  matcherGroups: CodexMatcherGroup[];
} {
  const cleaned = input.trim();

  if (!cleaned) {
    throw new Error('Input cannot be empty');
  }

  const parsed = parseToml<{ hooks?: Record<string, unknown> }>(cleaned);
  const hooks = parsed.hooks;

  if (!hooks || typeof hooks !== 'object' || Array.isArray(hooks)) {
    throw new Error('TOML input must contain inline [[hooks.<Event>]] tables');
  }

  const entries = Object.entries(hooks);

  if (entries.length === 0) {
    throw new Error('No Codex hook entry found in input');
  }

  if (entries.length > 1) {
    throw new Error('Please provide only one Codex hook entry at a time');
  }

  const [entryId, matcherGroups] = entries[0];
  return { entryId, matcherGroups: matcherGroups as CodexMatcherGroup[] };
}

/**
 * Antigravity CLI hook events pinned from the official hooks reference
 * (https://antigravity.google/docs/hooks/).
 */
export const AGY_HOOK_EVENTS = ['PreToolUse', 'PostToolUse', 'PreInvocation', 'PostInvocation', 'Stop'] as const;

/**
 * Parse one pasted Antigravity hook entry — exactly one top-level named group.
 */
export function parseAgyHookEntry(input: string): {
  entryId: string;
  group: Record<string, unknown>;
} {
  const { key: entryId, value: group } = parseSingleEntryJsonFragment(
    input,
    'Antigravity hook group',
    'Please provide only one Antigravity hook group at a time',
  );
  return { entryId, group: group as Record<string, unknown> };
}

/**
 * Cursor hook events pinned from the official hooks reference
 * (https://cursor.com/docs/hooks) — camelCase names.
 */
export const CURSOR_HOOK_EVENTS = [
  'sessionStart',
  'sessionEnd',
  'preToolUse',
  'postToolUse',
  'postToolUseFailure',
  'subagentStart',
  'subagentStop',
  'beforeShellExecution',
  'afterShellExecution',
  'beforeMCPExecution',
  'afterMCPExecution',
  'beforeReadFile',
  'afterFileEdit',
  'beforeSubmitPrompt',
  'preCompact',
  'stop',
  'afterAgentResponse',
  'afterAgentThought',
  'beforeTabFileRead',
  'afterTabFileEdit',
  'workspaceOpen',
] as const;

/**
 * Parse one pasted Cursor hook entry — exactly one event key mapping to an
 * array of native Cursor handlers ({ command, matcher?, timeout? }).
 */
export function parseCursorHookEntry(input: string): {
  entryId: string;
  handlers: unknown[];
} {
  const { key: entryId, value: handlers } = parseSingleEntryJsonFragment(
    input,
    'Cursor hook entry',
    'Please provide only one Cursor hook entry at a time',
  );

  if (!Array.isArray(handlers)) {
    throw new Error('A Cursor hook entry must map the event to an array of handlers');
  }

  return { entryId, handlers };
}

/**
 * Validate a parsed Codex hook entry: event from the pinned catalog,
 * matcher-group shape, and handler types (command or mcp_tool only).
 */
export function validateCodexHookEntry(entry: {
  entryId: string;
  matcherGroups: CodexMatcherGroup[];
}): void {
  if (!CODEX_HOOK_EVENTS.includes(entry.entryId as (typeof CODEX_HOOK_EVENTS)[number])) {
    throw new Error(
      `Unsupported Codex hook event: "${entry.entryId}". Supported events: ${CODEX_HOOK_EVENTS.join(', ')}`,
    );
  }

  if (!Array.isArray(entry.matcherGroups)) {
    throw new Error('A Codex hook entry must map the event to an array of matcher groups');
  }

  for (const group of entry.matcherGroups) {
    if (typeof group !== 'object' || group === null || Array.isArray(group)) {
      throw new Error('Each Codex matcher group must be an object');
    }

    if (!Array.isArray(group.hooks)) {
      throw new Error('Each Codex matcher group must contain a "hooks" array');
    }

    for (const handler of group.hooks) {
      if (typeof handler !== 'object' || handler === null || Array.isArray(handler)) {
        throw new Error('Each Codex hook handler must be an object');
      }

      if (handler.type === 'command') {
        if (typeof handler.command !== 'string') {
          throw new Error('Codex "command" hook handlers must include a "command" string');
        }
      } else if (handler.type === 'mcp_tool') {
        if (typeof handler.server !== 'string') {
          throw new Error('Codex "mcp_tool" hook handlers must include a "server" string');
        }
      } else {
        throw new Error(
          `Unsupported Codex hook handler type: "${String(handler.type)}". Supported types: command, mcp_tool`,
        );
      }
    }
  }
}

/**
 * Check every Codex mcp_tool handler's server against the Codex server registry;
 * a missing server is a hard error naming the server.
 */
export async function validateCodexMcpToolServerRefs(entry: {
  entryId: string;
  matcherGroups: CodexMatcherGroup[];
}): Promise<void> {
  for (const group of entry.matcherGroups) {
    for (const handler of group.hooks) {
      if (handler.type === 'mcp_tool') {
        const exists = await serverExistsInCodexRegistry(String(handler.server));
        if (!exists) {
          throw new Error(
            `The mcp_tool hook references server "${String(handler.server)}", which is not in the Codex server registry`,
          );
        }
      }
    }
  }
}

/**
 * Validate a parsed Antigravity named group: events from the pinned catalog,
 * command-only handlers, and a boolean `enabled` when present.
 */
export function validateAgyHookEntry(entry: {
  entryId: string;
  group: Record<string, unknown>;
}): void {
  const group = entry.group;

  if (typeof group !== 'object' || group === null || Array.isArray(group)) {
    throw new Error('Antigravity hook group must be an object');
  }

  if (group.enabled !== undefined && typeof group.enabled !== 'boolean') {
    throw new Error('Antigravity hook group "enabled" must be a boolean when present');
  }

  const events = Object.keys(group).filter((key) => key !== 'enabled');

  if (events.length === 0) {
    throw new Error('Antigravity hook group must contain at least one event');
  }

  for (const eventName of events) {
    if (!AGY_HOOK_EVENTS.includes(eventName as (typeof AGY_HOOK_EVENTS)[number])) {
      throw new Error(
        `Unsupported Antigravity hook event: "${eventName}". Supported events: ${AGY_HOOK_EVENTS.join(', ')}`,
      );
    }

    const groups = group[eventName];
    if (!Array.isArray(groups)) {
      throw new Error(`Antigravity hook event "${eventName}" must map to an array of matcher groups`);
    }

    for (const matcherGroup of groups) {
      if (typeof matcherGroup !== 'object' || matcherGroup === null || Array.isArray(matcherGroup)) {
        throw new Error('Each Antigravity matcher group must be an object');
      }

      const hooks = (matcherGroup as Record<string, unknown>).hooks;
      if (!Array.isArray(hooks)) {
        throw new Error('Each Antigravity matcher group must contain a "hooks" array');
      }

      for (const handler of hooks) {
        if (typeof handler !== 'object' || handler === null || Array.isArray(handler)) {
          throw new Error('Each Antigravity hook handler must be an object');
        }

        const record = handler as Record<string, unknown>;
        if (record.type !== 'command' || typeof record.command !== 'string') {
          throw new Error('Antigravity hook handlers must be "type": "command" with a "command" string');
        }
      }
    }
  }
}

/**
 * Validate a parsed Cursor hook entry: event from the pinned catalog and
 * command-only handlers with a required command string.
 */
export function validateCursorHookEntry(entry: {
  entryId: string;
  handlers: unknown[];
}): void {
  if (!CURSOR_HOOK_EVENTS.includes(entry.entryId as (typeof CURSOR_HOOK_EVENTS)[number])) {
    throw new Error(
      `Unsupported Cursor hook event: "${entry.entryId}". Supported events: ${CURSOR_HOOK_EVENTS.join(', ')}`,
    );
  }

  for (const handler of entry.handlers) {
    if (typeof handler !== 'object' || handler === null || Array.isArray(handler)) {
      throw new Error('Each Cursor hook handler must be an object');
    }

    const record = handler as Record<string, unknown>;

    if (record.type !== undefined && record.type !== 'command') {
      throw new Error(
        `Unsupported Cursor hook handler type: "${String(record.type)}". Supported type: command`,
      );
    }

    if (typeof record.command !== 'string') {
      throw new Error('Cursor hook handlers must include a "command" string (supported type: command)');
    }
  }
}

/**
 * Flexible JSON fragment parse shared by the per-platform JSON hook parsers:
 * trim, tolerate a trailing comma and optional outer braces, require exactly
 * one top-level entry.
 */
function parseSingleEntryJsonFragment(
  input: string,
  subjectLabel: string,
  singleEntryMessage: string,
): { key: string; value: unknown } {
  let cleaned = input.trim();

  if (!cleaned) {
    throw new Error('Input cannot be empty');
  }

  cleaned = cleaned.replace(/,\s*$/, '');

  if (!cleaned.startsWith('{')) {
    cleaned = `{${cleaned}}`;
  }

  const parseResult = parseJSON(cleaned);
  if (!parseResult.success) {
    throw new Error(parseResult.error);
  }

  const entries = Object.entries(parseResult.data);

  if (entries.length === 0) {
    throw new Error(`No ${subjectLabel} found in input`);
  }

  if (entries.length > 1) {
    throw new Error(singleEntryMessage);
  }

  const [key, value] = entries[0];
  return { key, value };
}

/**
 * Parse one pasted Claude hook entry — one event's matcher groups.
 * Tolerates a fragment without outer braces; rejects multi-entry pastes.
 */
export function parseClaudeHookEntry(input: string): ClaudeHookEntry {
  const { key: entryId, value: matcherGroups } = parseSingleEntryJsonFragment(
    input,
    'hook entry',
    'Please provide only one hook entry at a time',
  );
  return { entryId, matcherGroups: matcherGroups as ClaudeMatcherGroup[] };
}

/**
 * Validate a parsed Claude hook entry: event from the pinned catalog,
 * matcher-group shape, and handler types (command or mcp_tool only).
 */
export function validateClaudeHookEntry(entry: ClaudeHookEntry): void {
  if (!CLAUDE_HOOK_EVENTS.includes(entry.entryId as (typeof CLAUDE_HOOK_EVENTS)[number])) {
    throw new Error(
      `Unsupported Claude hook event: "${entry.entryId}". Supported events: ${CLAUDE_HOOK_EVENTS.join(', ')}`,
    );
  }

  if (!Array.isArray(entry.matcherGroups)) {
    throw new Error('A Claude hook entry must map the event to an array of matcher groups');
  }

  for (const group of entry.matcherGroups) {
    if (typeof group !== 'object' || group === null || Array.isArray(group)) {
      throw new Error('Each Claude matcher group must be an object');
    }

    if (!Array.isArray(group.hooks)) {
      throw new Error('Each Claude matcher group must contain a "hooks" array');
    }

    for (const handler of group.hooks) {
      if (typeof handler !== 'object' || handler === null || Array.isArray(handler)) {
        throw new Error('Each Claude hook handler must be an object');
      }

      if (handler.type === 'command') {
        if (typeof handler.command !== 'string') {
          throw new Error('Claude "command" hook handlers must include a "command" string');
        }
      } else if (handler.type === 'mcp_tool') {
        if (typeof handler.server !== 'string') {
          throw new Error('Claude "mcp_tool" hook handlers must include a "server" string');
        }
      } else {
        throw new Error(
          `Unsupported Claude hook handler type: "${String(handler.type)}". Supported types: command, mcp_tool`,
        );
      }
    }
  }
}

/**
 * Check every mcp_tool handler's server against the Claude server registry;
 * a missing server is a hard error naming the server.
 */
export async function validateClaudeMcpToolServerRefs(entry: ClaudeHookEntry): Promise<void> {
  for (const group of entry.matcherGroups) {
    for (const handler of group.hooks) {
      if (handler.type === 'mcp_tool') {
        const exists = await serverExistsInRegistry(String(handler.server));
        if (!exists) {
          throw new Error(
            `The mcp_tool hook references server "${String(handler.server)}", which is not in the Claude server registry`,
          );
        }
      }
    }
  }
}