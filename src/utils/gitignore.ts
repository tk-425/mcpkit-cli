import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { getProjectGitignorePath } from './paths.js';

const GITIGNORE_LINE = '.mcpkit/';

export async function ensureMcpkitGitignoreBlock(): Promise<boolean> {
  const gitignorePath = getProjectGitignorePath();
  const hasFile = existsSync(gitignorePath);
  const existing = hasFile ? await readFile(gitignorePath, 'utf-8') : '';

  if (existing.length > 0) {
    const lines = existing.split('\n');
    const hasLine = lines.some(line => line.trim() === GITIGNORE_LINE);
    if (hasLine) {
      return false;
    }
  }

  const needsLeadingNewline = existing.length > 0 && !existing.endsWith('\n');
  const nextContent = [
    existing,
    ...(existing.length > 0 ? [needsLeadingNewline ? '\n' : '', '\n'] : []),
    GITIGNORE_LINE,
    '\n',
  ].join('');

  await writeFile(gitignorePath, nextContent, 'utf-8');
  return true;
}
