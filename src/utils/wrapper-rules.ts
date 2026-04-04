import type { CodexMcpServerConfig } from './codex-config.js';
import { hasInterpolatedEnv, findInterpolatedEnvNames, isPureEnvReference } from './interpolation.js';
import type { ServerConfig } from './registry.js';
import type { WrapperConfig } from './wrapper-types.js';

type NativeConfig = ServerConfig | CodexMcpServerConfig;

export interface WrapperResolution {
  kind: 'direct' | 'wrap' | 'skip';
  wrapper?: WrapperConfig;
  reason?: string;
}

function normalizeCommand(config: NativeConfig): { command?: string; args: string[]; url?: string } {
  if (Array.isArray(config.command)) {
    const [command, ...commandArgs] = config.command;
    return {
      command,
      args: [...commandArgs, ...(config.args ?? [])],
      url: config.url,
    };
  }

  return {
    command: config.command,
    args: config.args ?? [],
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
    }),
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
  targetLabel: 'Claude Code' | 'Codex CLI',
): WrapperResolution {
  const normalized = normalizeCommand(config);
  const usesInterpolation = hasInterpolatedEnv(config);

  if (!usesInterpolation) {
    return { kind: 'direct' };
  }

  if (normalized.url !== undefined || (config as Record<string, unknown>).headers !== undefined) {
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
