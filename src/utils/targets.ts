export const TARGETS = ['claude', 'codex', 'opencode', 'gemini', 'cursor'] as const;

export type McpTarget = typeof TARGETS[number];

export interface TargetOptions {
  claude?: boolean;
  codex?: boolean;
  opencode?: boolean;
  gemini?: boolean;
  cursor?: boolean;
}

/**
 * Resolve only explicitly requested CLI targets.
 * Interactive no-flag behavior is handled by command-layer prompts in later steps.
 */
export function getExplicitTargets(options: TargetOptions): McpTarget[] {
  const targets: McpTarget[] = [];

  if (options.claude) {
    targets.push('claude');
  }

  if (options.codex) {
    targets.push('codex');
  }

  if (options.opencode) {
    targets.push('opencode');
  }

  if (options.gemini) {
    targets.push('gemini');
  }

  if (options.cursor) {
    targets.push('cursor');
  }

  return targets;
}

export function hasExplicitTargetSelection(options: TargetOptions): boolean {
  return getExplicitTargets(options).length > 0;
}

export function isSupportedTarget(value: string): value is McpTarget {
  return TARGETS.includes(value as McpTarget);
}
