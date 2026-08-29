import { checkbox, select } from '@inquirer/prompts';
import type { HookTarget } from '../utils/hook-apply.js';
import type { TargetOptions } from '../utils/targets.js';

export type { HookTarget };

export const HOOK_TARGETS: HookTarget[] = ['claude', 'codex', 'agy', 'cursor'];

const HOOK_TARGET_CHOICES = [
  { name: 'Claude Code', value: 'claude' },
  { name: 'Codex CLI', value: 'codex' },
  { name: 'Antigravity CLI', value: 'agy' },
  { name: 'Cursor', value: 'cursor' },
] as const;

/**
 * Resolve only explicitly requested hook targets; the opencode flag is never
 * a hook target.
 */
export function getExplicitHookTargets(options: TargetOptions): HookTarget[] {
  const targets: HookTarget[] = [];

  if (options.claude) {
    targets.push('claude');
  }

  if (options.codex) {
    targets.push('codex');
  }

  if (options.agy) {
    targets.push('agy');
  }

  if (options.cursor) {
    targets.push('cursor');
  }

  return targets;
}

export function hasOpenCodeFlag(options: TargetOptions): boolean {
  return options.opencode === true;
}

export function openCodeUnsupportedMessage(): string {
  return (
    'OpenCode does not support declarative hooks; hooks are configured through plugins ' +
    '(https://opencode.ai/docs/plugins/).'
  );
}

export function throwIfOpenCode(options: TargetOptions): void {
  if (hasOpenCodeFlag(options)) {
    throw new Error(openCodeUnsupportedMessage());
  }
}

/**
 * Resolve exactly one hook target: throwIfOpenCode first, error on multiple
 * explicit targets, return a single explicit target, or prompt via select.
 */
export async function resolveHookSingleTarget(
  options: TargetOptions,
  promptMessage: string,
): Promise<HookTarget | null> {
  throwIfOpenCode(options);

  const explicitTargets = getExplicitHookTargets(options);

  if (explicitTargets.length > 1) {
    throw new Error('Choose only one target for this command.');
  }

  if (explicitTargets.length === 1) {
    return explicitTargets[0];
  }

  return select<HookTarget>({
    message: promptMessage,
    choices: [...HOOK_TARGET_CHOICES],
  });
}

/**
 * Resolve one or more hook targets: throwIfOpenCode first, explicit targets
 * as-is, or a checkbox over the four hook platforms.
 */
export async function resolveHookProjectTargets(
  options: TargetOptions,
  promptMessage: string,
): Promise<HookTarget[]> {
  throwIfOpenCode(options);

  const explicitTargets = getExplicitHookTargets(options);

  if (explicitTargets.length > 0) {
    return explicitTargets;
  }

  return checkbox<HookTarget>({
    message: promptMessage,
    choices: [...HOOK_TARGET_CHOICES].map((choice) => ({ ...choice, checked: false })),
    required: false,
  });
}