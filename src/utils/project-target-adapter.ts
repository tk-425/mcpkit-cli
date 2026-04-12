import type { CodexConfigFile, CodexMcpServerConfig } from "./codex-config.js";
import {
  addServerToCodexProject,
  codexProjectConfigExists,
  ensureCodexMcpServers,
  readCodexProjectConfig,
  readCodexProjectConfigOrDefault,
  readCodexRegistry,
  removeServerFromCodexProject,
  writeCodexProjectConfig,
} from "./codex-config.js";
import type { EmitResult } from "./project-emitter.js";
import {
  emitClaudeProjectServer,
  emitCodexProjectServer,
} from "./project-emitter.js";
import type { ProjectConfig } from "./project-config.js";
import {
  addServerToProject,
  projectConfigExists,
  readProjectConfig,
  removeServerFromProject,
  writeProjectConfig,
} from "./project-config.js";
import type { Registry, ServerConfig } from "./registry.js";
import { readRegistry } from "./registry.js";
import { stringifyToml } from "./toml.js";
import type { McpTarget } from "./targets.js";
import { parseCodexServerInput, parseServerInput } from "./validation.js";

export interface ProjectTargetAdapter<TConfig, TRegistry, TServer> {
  key: McpTarget;
  label: string;
  configPath: string;
  configExists(): boolean;
  readConfig(): Promise<TConfig>;
  readConfigOrDefault(): Promise<TConfig>;
  writeConfig(config: TConfig): Promise<void>;
  createEmptyConfig(): TConfig;
  resetServers(config: TConfig): void;
  getProjectServers(config: TConfig): Record<string, TServer>;
  readRegistry(): Promise<TRegistry>;
  getRegistryServers(registry: TRegistry): Record<string, TServer>;
  emitProjectServer(name: string, config: TServer): Promise<EmitResult<TServer>>;
  addServer(name: string, config: TServer): Promise<void>;
  removeServer(name: string): Promise<boolean>;
  serializeServerForEdit(name: string, config: TServer): string;
  parseEditedServerInput(input: string): { name: string; config: TServer };
}

export function sortCaseInsensitive(values: string[]): string[] {
  return [...values].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

const claudeProjectAdapter: ProjectTargetAdapter<
  ProjectConfig,
  Registry,
  ServerConfig
> = {
  key: "claude",
  label: "Claude Code",
  configPath: ".mcp.json",
  configExists: projectConfigExists,
  readConfig: readProjectConfig,
  readConfigOrDefault: async () =>
    projectConfigExists() ? readProjectConfig() : { mcpServers: {} },
  writeConfig: writeProjectConfig,
  createEmptyConfig: () => ({ mcpServers: {} }),
  resetServers: (config) => {
    config.mcpServers = {};
  },
  getProjectServers: (config) => config.mcpServers,
  readRegistry,
  getRegistryServers: (registry) => registry.servers,
  emitProjectServer: emitClaudeProjectServer,
  addServer: addServerToProject,
  removeServer: removeServerFromProject,
  serializeServerForEdit: (name, config) =>
    JSON.stringify({ [name]: config }, null, 2),
  parseEditedServerInput: parseServerInput,
};

const codexProjectAdapter: ProjectTargetAdapter<
  CodexConfigFile,
  CodexConfigFile,
  CodexMcpServerConfig
> = {
  key: "codex",
  label: "Codex CLI",
  configPath: ".codex/config.toml",
  configExists: codexProjectConfigExists,
  readConfig: readCodexProjectConfig,
  readConfigOrDefault: readCodexProjectConfigOrDefault,
  writeConfig: writeCodexProjectConfig,
  createEmptyConfig: () => ({ mcp_servers: {} }),
  resetServers: (config) => {
    config.mcp_servers = {};
  },
  getProjectServers: ensureCodexMcpServers,
  readRegistry: readCodexRegistry,
  getRegistryServers: ensureCodexMcpServers,
  emitProjectServer: emitCodexProjectServer,
  addServer: addServerToCodexProject,
  removeServer: removeServerFromCodexProject,
  serializeServerForEdit: (name, config) =>
    stringifyToml({ mcp_servers: { [name]: config } }),
  parseEditedServerInput: parseCodexServerInput,
};

export const PROJECT_TARGET_ADAPTERS = [
  claudeProjectAdapter,
  codexProjectAdapter,
] as const;

export type AnyProjectTargetAdapter =
  (typeof PROJECT_TARGET_ADAPTERS)[number];

export function getProjectTargetAdapter(
  target: "claude",
): ProjectTargetAdapter<ProjectConfig, Registry, ServerConfig>;
export function getProjectTargetAdapter(
  target: "codex",
): ProjectTargetAdapter<CodexConfigFile, CodexConfigFile, CodexMcpServerConfig>;
export function getProjectTargetAdapter(
  target: McpTarget,
): AnyProjectTargetAdapter;
export function getProjectTargetAdapter(
  target: McpTarget,
): AnyProjectTargetAdapter {
  if (target === "claude") {
    return claudeProjectAdapter;
  }

  return codexProjectAdapter;
}
