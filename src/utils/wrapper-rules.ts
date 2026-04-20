import type { CodexMcpServerConfig } from './codex-config.js';
import type { OpenCodeMcpServerConfig } from './opencode-config.js';
import { hasInterpolatedEnv, findInterpolatedEnvNames, isPureEnvReference } from './interpolation.js';
import type { ServerConfig } from './registry.js';
import type { WrapperConfig } from './wrapper-types.js';

type NativeConfig = ServerConfig | CodexMcpServerConfig | OpenCodeMcpServerConfig;

export interface WrapperResolution {
  kind: 'direct' | 'wrap' | 'skip';
  wrapper?: WrapperConfig;
  reason?: string;
}

type RemoteHttpShapeSupport = 'none' | 'supported' | 'unsupported';
type RemoteHttpHeaderSource = 'headers' | 'http_headers' | null;

function normalizeCommand(config: NativeConfig): { command?: string; args: string[]; url?: string } {
  const rawArgs = (config as { args?: unknown }).args;
  const args = Array.isArray(rawArgs) && rawArgs.every((item) => typeof item === 'string')
    ? rawArgs
    : [];

  if (Array.isArray(config.command)) {
    const [command, ...commandArgs] = config.command;
    return {
      command,
      args: [...commandArgs, ...args],
      url: config.url,
    };
  }

  return {
    command: config.command,
    args,
    url: config.url,
  };
}

function getStringRecord(config: NativeConfig, key: string): Record<string, string> {
  const value = (config as Record<string, unknown>)[key];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

function getRemoteHttpHeaderSource(config: NativeConfig): RemoteHttpHeaderSource {
  if (Object.keys(getStringRecord(config, 'headers')).length > 0) {
    return 'headers';
  }

  if (Object.keys(getStringRecord(config, 'http_headers')).length > 0) {
    return 'http_headers';
  }

  return null;
}

function getSupportedRemoteHttpHeaders(config: NativeConfig): Record<string, string> {
  const source = getRemoteHttpHeaderSource(config);

  if (source === null) {
    return {};
  }

  return getStringRecord(config, source);
}

function classifyRemoteHttpShapeSupport(config: NativeConfig): RemoteHttpShapeSupport {
  const normalized = normalizeCommand(config);
  const headers = getSupportedRemoteHttpHeaders(config);
  const envHttpHeaders = getStringRecord(config, 'env_http_headers');
  const bearerTokenEnvVar = (config as { bearer_token_env_var?: unknown }).bearer_token_env_var;

  const hasRemoteEndpoint = typeof normalized.url === 'string' && normalized.url.length > 0;
  const hasInterpolatedHeaderValue = hasInterpolatedEnv(headers);
  const hasEnvHeaderMap = Object.keys(envHttpHeaders).length > 0;
  const hasBearerTokenEnvVar =
    typeof bearerTokenEnvVar === 'string' && bearerTokenEnvVar.trim().length > 0;

  if (!hasRemoteEndpoint || (!hasInterpolatedHeaderValue && !hasEnvHeaderMap && !hasBearerTokenEnvVar)) {
    return 'none';
  }

  const hasSupportedHeaderSource = Object.keys(headers).length > 0 && hasInterpolatedHeaderValue;

  if (
    normalized.command === undefined &&
    hasSupportedHeaderSource &&
    !hasEnvHeaderMap &&
    !hasBearerTokenEnvVar
  ) {
    return 'supported';
  }

  return 'unsupported';
}

function buildRemoteHttpWrapperConfig(
  serverName: string,
  config: NativeConfig,
): WrapperConfig {
  const normalized = normalizeCommand(config);
  const headers = getSupportedRemoteHttpHeaders(config);

  if (!normalized.url) {
    throw new Error(`Remote/http wrapper conversion requires a URL for "${serverName}"`);
  }

  const headerArgs = Object.entries(headers).flatMap(([name, value]) => [
    '--header',
    `${name}: ${value}`,
  ]);

  return {
    scriptName: serverName,
    requiredEnv: findInterpolatedEnvNames(headers).sort(),
    useLoadEnv: true,
    exec: {
      command: 'npx',
      argTemplates: [
        '-y',
        'supergateway',
        '--streamableHttp',
        normalized.url,
        ...headerArgs,
      ],
    },
  };
}

function buildGenericWrapperConfig(
  serverName: string,
  config: NativeConfig,
): WrapperConfig {
  const normalized = normalizeCommand(config);
  const envMap = {
    ...getStringRecord(config, 'env'),
    ...getStringRecord(config, 'environment'),
  };

  const staticEnv: Record<string, string> = {};
  const forwardedEnv: Record<string, string> = {};
  const templatedEnv: Record<string, string> = {};

  for (const [key, value] of Object.entries(envMap)) {
    const referencedEnv = isPureEnvReference(value);
    if (referencedEnv) {
      forwardedEnv[key] = referencedEnv;
    } else if (hasInterpolatedEnv(value)) {
      templatedEnv[key] = value;
    } else {
      staticEnv[key] = value;
    }
  }

  return {
    scriptName: serverName,
    requiredEnv: findInterpolatedEnvNames({
      args: normalized.args,
      env: envMap,
    }).sort(),
    staticEnv: Object.keys(staticEnv).length > 0 ? staticEnv : undefined,
    forwardedEnv: Object.keys(forwardedEnv).length > 0 ? forwardedEnv : undefined,
    templatedEnv: Object.keys(templatedEnv).length > 0 ? templatedEnv : undefined,
    useLoadEnv: true,
    exec: {
      command: normalized.command!,
      argTemplates: normalized.args,
    },
  };
}

function resolveCommon(
  serverName: string,
  config: NativeConfig,
  targetLabel: 'Claude Code' | 'Codex CLI' | 'OpenCode CLI',
): WrapperResolution {
  const normalized = normalizeCommand(config);
  const usesInterpolation = hasInterpolatedEnv(config);
  const remoteHttpShapeSupport = classifyRemoteHttpShapeSupport(config);

  if (remoteHttpShapeSupport === 'supported') {
    return {
      kind: 'wrap',
      wrapper: buildRemoteHttpWrapperConfig(serverName, config),
    };
  }

  if (remoteHttpShapeSupport === 'unsupported') {
    return {
      kind: 'skip',
      reason:
        `Skipped "${serverName}": ${targetLabel} server uses a remote/http env injection shape ` +
        'that is not supported for wrapper conversion.',
    };
  }

  if (!usesInterpolation) {
    return { kind: 'direct' };
  }

  if (
    normalized.url !== undefined ||
    getRemoteHttpHeaderSource(config) !== null ||
    Object.keys(getStringRecord(config, 'env_http_headers')).length > 0 ||
    typeof (config as { bearer_token_env_var?: unknown }).bearer_token_env_var === 'string'
  ) {
    return {
      kind: 'skip',
      reason: `Skipped "${serverName}": ${targetLabel} server uses env interpolation in a remote/http config that cannot be wrapped safely yet.`,
    };
  }

  if (!normalized.command) {
    return {
      kind: 'skip',
      reason: `Skipped "${serverName}": ${targetLabel} server uses env interpolation but has no supported stdio command launcher.`,
    };
  }

  return {
    kind: 'wrap',
    wrapper: buildGenericWrapperConfig(serverName, config),
  };
}

export function resolveClaudeWrapperConfig(
  serverName: string,
  config: ServerConfig,
): WrapperResolution {
  return resolveCommon(serverName, config, 'Claude Code');
}

export function resolveCodexWrapperConfig(
  serverName: string,
  config: CodexMcpServerConfig,
): WrapperResolution {
  return resolveCommon(serverName, config, 'Codex CLI');
}

export function resolveOpenCodeWrapperConfig(
  serverName: string,
  config: OpenCodeMcpServerConfig,
): WrapperResolution {
  return resolveCommon(serverName, config, 'OpenCode CLI');
}
