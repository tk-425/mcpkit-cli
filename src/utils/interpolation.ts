const ENV_VAR_PATTERN = /\$\{([A-Z0-9_]+)\}/g;

export function findInterpolatedEnvNames(value: unknown): string[] {
  const names = new Set<string>();

  function walk(current: unknown): void {
    if (typeof current === 'string') {
      for (const match of current.matchAll(ENV_VAR_PATTERN)) {
        names.add(match[1]);
      }
      return;
    }

    if (Array.isArray(current)) {
      current.forEach(walk);
      return;
    }

    if (current && typeof current === 'object') {
      Object.values(current).forEach(walk);
    }
  }

  walk(value);
  return [...names];
}

export function hasInterpolatedEnv(value: unknown): boolean {
  return findInterpolatedEnvNames(value).length > 0;
}

export function isPureEnvReference(value: string): string | null {
  const match = value.match(/^\$\{([A-Z0-9_]+)\}$/);
  return match ? match[1] : null;
}
