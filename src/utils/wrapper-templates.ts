import type { WrapperConfig } from './wrapper-types.js';

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function shellTemplateQuote(value: string): string {
  return `"${value.replace(/["\\`]/g, "\\$&")}"`;
}

export function buildLoadEnvScript(): string {
  const standardKeys = [
    'AIKIDO_API_KEY',
    'CONTEXT_7_KEY',
    'FIRECRAWL_KEY',
    'GLM_MCP_API_KEY',
    'N8N_MCP_KEY',
    'TAVILY_API_KEY',
  ];

  const standardKeyBlock = standardKeys
    .map(
      (key) => `if [[ -z "\${${key}:-}" ]]; then
  secret_value="$(security find-generic-password -a "$USER" -s ${shellQuote(key)} -w 2>/dev/null || true)"
  if [[ -n "$secret_value" ]]; then
    export ${key}="$secret_value"
  fi
fi`,
    )
    .join('\n\n');

  return `#!/bin/zsh
set -euo pipefail

if command -v security >/dev/null 2>&1; then
${standardKeyBlock}

  if [[ -z "\${NVIDIA_NIM_API_KEY:-}" ]]; then
    secret_value="$(security find-generic-password -a "nvidia-nim" -s "nvidia-nim-api-key" -w 2>/dev/null || true)"
    if [[ -n "$secret_value" ]]; then
      export NVIDIA_NIM_API_KEY="$secret_value"
    fi
  fi
fi

exec "$@"
`;
}

export function buildWrapperScript(wrapperConfig: WrapperConfig): string {
  const commandParts = [
    shellQuote(wrapperConfig.exec.command),
    ...((wrapperConfig.exec.argTemplates ?? []).length > 0
      ? (wrapperConfig.exec.argTemplates ?? []).map(shellTemplateQuote)
      : (wrapperConfig.exec.args ?? []).map(shellQuote)),
    ...(wrapperConfig.exec.envArgs ?? []).flatMap(({ flag, envName }) => [
      shellQuote(flag),
      `"\$${envName}"`,
    ]),
  ];

  const requiredEnvChecks = (wrapperConfig.requiredEnv ?? [])
    .map(
      (envName) => `if [[ -z "\${${envName}:-}" ]]; then
  print -u2 "Error: ${envName} is not set."
  exit 1
fi`,
    )
    .join('\n\n');

  const staticEnvExports = Object.entries(wrapperConfig.staticEnv ?? {})
    .map(([key, value]) => `export ${key}=${shellQuote(value)}`)
    .join('\n');
  const forwardedEnvExports = Object.entries(wrapperConfig.forwardedEnv ?? {})
    .map(([key, envName]) => `export ${key}="\$${envName}"`)
    .join('\n');
  const templatedEnvExports = Object.entries(wrapperConfig.templatedEnv ?? {})
    .map(([key, value]) => `export ${key}=${shellTemplateQuote(value)}`)
    .join('\n');

  const innerLines = [
    '#!/bin/zsh',
    'set -euo pipefail',
    '',
    'script_dir="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"',
    '',
    ...(requiredEnvChecks ? [requiredEnvChecks, ''] : []),
    ...(staticEnvExports ? [staticEnvExports, ''] : []),
    ...(forwardedEnvExports ? [forwardedEnvExports, ''] : []),
    ...(templatedEnvExports ? [templatedEnvExports, ''] : []),
    `exec ${commandParts.join(' ')}`,
    '',
  ];

  const innerScript = innerLines.join('\n');

  if (wrapperConfig.useLoadEnv === false) {
    return innerScript;
  }

  return `#!/bin/zsh
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"

exec "$script_dir/load-env" zsh -c ${shellQuote(innerScript)}
`;
}
