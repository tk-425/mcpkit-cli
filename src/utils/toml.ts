import { parse, stringify } from '@iarna/toml';

export type TomlSerializable = Record<string, unknown>;

export function parseToml<T = Record<string, unknown>>(content: string): T {
  try {
    return parse(content) as T;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid TOML syntax: ${error.message}`);
    }

    throw new Error('Invalid TOML syntax');
  }
}

export function stringifyToml(value: TomlSerializable): string {
  return stringify(value as never);
}
