import type { CodexMcpServerConfig } from './codex-config.js';
import { ensureServerWrapper } from './project-runtime.js';
import type { ServerConfig } from './registry.js';
import {
  resolveClaudeWrapperConfig,
  resolveCodexWrapperConfig,
} from './wrapper-rules.js';

export interface EmitResult<T> {
  config?: T;
  usedWrapper: boolean;
  skipped: boolean;
  reason?: string;
  wrapperPath?: string;
}

export async function emitClaudeProjectServer(
  name: string,
  config: ServerConfig,
): Promise<EmitResult<ServerConfig>> {
  const resolution = resolveClaudeWrapperConfig(name, config);

  if (resolution.kind === 'direct') {
    return { config, usedWrapper: false, skipped: false };
  }

  if (resolution.kind === 'skip') {
    return {
      usedWrapper: false,
      skipped: true,
      reason: resolution.reason,
    };
  }

  const runtime = await ensureServerWrapper(resolution.wrapper!);
  const { args: _args, env: _env, ...rest } = config;

  return {
    config: {
      ...rest,
      command: runtime.wrapperPath,
    },
    usedWrapper: true,
    skipped: false,
    wrapperPath: runtime.wrapperPath,
  };
}

export async function emitCodexProjectServer(
  name: string,
  config: CodexMcpServerConfig,
): Promise<EmitResult<CodexMcpServerConfig>> {
  const resolution = resolveCodexWrapperConfig(name, config);

  if (resolution.kind === 'direct') {
    return { config, usedWrapper: false, skipped: false };
  }

  if (resolution.kind === 'skip') {
    return {
      usedWrapper: false,
      skipped: true,
      reason: resolution.reason,
    };
  }

  const runtime = await ensureServerWrapper(resolution.wrapper!);
  const {
    args: _args,
    env: _env,
    env_vars: _envVars,
    ...rest
  } = config;

  return {
    config: {
      ...rest,
      command: runtime.wrapperPath,
    },
    usedWrapper: true,
    skipped: false,
    wrapperPath: runtime.wrapperPath,
  };
}
