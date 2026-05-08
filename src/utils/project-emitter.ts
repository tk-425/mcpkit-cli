import type { CodexMcpServerConfig } from './codex-config.js';
import type { OpenCodeMcpServerConfig } from './opencode-config.js';
import type { GeminiMcpServerConfig } from './gemini-config.js';
import type { CursorMcpServerConfig } from './cursor-config.js';
import { ensureServerWrapper } from './project-runtime.js';
import type { ServerConfig } from './registry.js';
import {
  resolveClaudeWrapperConfig,
  resolveCodexWrapperConfig,
  resolveOpenCodeWrapperConfig,
  resolveGeminiWrapperConfig,
  resolveCursorWrapperConfig,
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
  const {
    args: _args,
    env: _env,
    url: _url,
    headers: _headers,
    type: _type,
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
    url: _url,
    http_headers: _httpHeaders,
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

export async function emitOpenCodeProjectServer(
  name: string,
  config: OpenCodeMcpServerConfig,
): Promise<EmitResult<OpenCodeMcpServerConfig>> {
  const resolution = resolveOpenCodeWrapperConfig(name, config);

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
    type: _type,
    command: _command,
    url: _url,
    headers: _headers,
    environment: _environment,
    oauth: _oauth,
    ...rest
  } = config;

  return {
    config: {
      ...rest,
      type: 'local',
      command: [runtime.wrapperPath!],
    },
    usedWrapper: true,
    skipped: false,
    wrapperPath: runtime.wrapperPath,
  };
}

export async function emitGeminiProjectServer(
  name: string,
  config: GeminiMcpServerConfig,
): Promise<EmitResult<GeminiMcpServerConfig>> {
  const resolution = resolveGeminiWrapperConfig(name, config);

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
    url: _url,
    httpUrl: _httpUrl,
    headers: _headers,
    cwd: _cwd,
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

export async function emitCursorProjectServer(
  name: string,
  config: CursorMcpServerConfig,
): Promise<EmitResult<CursorMcpServerConfig>> {
  const resolution = resolveCursorWrapperConfig(name, config);

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
    url: _url,
    headers: _headers,
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
