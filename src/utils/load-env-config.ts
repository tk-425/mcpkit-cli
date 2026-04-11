import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';

import { getLoadEnvConfigPath, getRegistryDir } from './paths.js';
import { validateEnvVarName } from './validation.js';

export interface LoadEnvConfig {
  extraEnvVars: string[];
}

const DEFAULT_LOAD_ENV_CONFIG: LoadEnvConfig = {
  extraEnvVars: [],
};

function normalizeEnvVarName(name: string): string {
  return name.trim();
}

function normalizeEnvVarList(names: string[]): string[] {
  const uniqueNames = new Set<string>();

  for (const rawName of names) {
    const name = normalizeEnvVarName(rawName);
    const validation = validateEnvVarName(name);

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    uniqueNames.add(name);
  }

  return [...uniqueNames].sort();
}

function parseLoadEnvConfig(content: string, configPath: string): LoadEnvConfig {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        `Invalid JSON in load-env config: ${configPath}\n` +
        `Please fix the JSON syntax or delete the file to reset.`,
      );
    }

    throw error;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Load-env config must be a JSON object');
  }

  const extraEnvVars = (parsed as { extraEnvVars?: unknown }).extraEnvVars;

  if (extraEnvVars === undefined) {
    return { ...DEFAULT_LOAD_ENV_CONFIG };
  }

  if (!Array.isArray(extraEnvVars) || !extraEnvVars.every((item) => typeof item === 'string')) {
    throw new Error('"extraEnvVars" in load-env config must be an array of strings');
  }

  return {
    extraEnvVars: normalizeEnvVarList(extraEnvVars),
  };
}

export async function initLoadEnvConfig(): Promise<void> {
  const registryDir = getRegistryDir();
  const configPath = getLoadEnvConfigPath();

  if (!existsSync(registryDir)) {
    await mkdir(registryDir, { recursive: true });
  }

  if (!existsSync(configPath)) {
    await writeFile(configPath, JSON.stringify(DEFAULT_LOAD_ENV_CONFIG, null, 2), 'utf-8');
  }
}

export async function readLoadEnvConfig(): Promise<LoadEnvConfig> {
  const configPath = getLoadEnvConfigPath();

  if (!existsSync(configPath)) {
    await initLoadEnvConfig();
    return { ...DEFAULT_LOAD_ENV_CONFIG };
  }

  try {
    const content = await readFile(configPath, 'utf-8');
    return parseLoadEnvConfig(content, configPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new Error(
        `Permission denied reading load-env config: ${configPath}\n` +
        `Please check file permissions.`,
      );
    }

    throw error;
  }
}

export async function writeLoadEnvConfig(config: LoadEnvConfig): Promise<void> {
  const configPath = getLoadEnvConfigPath();
  const registryDir = getRegistryDir();
  const normalizedConfig: LoadEnvConfig = {
    extraEnvVars: normalizeEnvVarList(config.extraEnvVars ?? []),
  };

  try {
    if (!existsSync(registryDir)) {
      await mkdir(registryDir, { recursive: true });
    }

    await writeFile(configPath, JSON.stringify(normalizedConfig, null, 2), 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      throw new Error(
        `Permission denied writing load-env config: ${configPath}\n` +
        `Please check file and directory permissions.`,
      );
    }

    if ((error as NodeJS.ErrnoException).code === 'ENOSPC') {
      throw new Error(
        `No space left on device when writing to: ${configPath}\n` +
        `Please free up disk space and try again.`,
      );
    }

    throw error;
  }
}

export async function listConfiguredLoadEnvVars(): Promise<string[]> {
  const config = await readLoadEnvConfig();
  return [...config.extraEnvVars];
}

export async function addConfiguredLoadEnvVar(name: string): Promise<boolean> {
  const normalizedName = normalizeEnvVarName(name);
  const config = await readLoadEnvConfig();

  if (config.extraEnvVars.includes(normalizedName)) {
    return false;
  }

  await writeLoadEnvConfig({
    extraEnvVars: [...config.extraEnvVars, normalizedName],
  });

  return true;
}

export async function removeConfiguredLoadEnvVar(name: string): Promise<boolean> {
  const normalizedName = normalizeEnvVarName(name);
  const config = await readLoadEnvConfig();

  if (!config.extraEnvVars.includes(normalizedName)) {
    return false;
  }

  await writeLoadEnvConfig({
    extraEnvVars: config.extraEnvVars.filter((item) => item !== normalizedName),
  });

  return true;
}
