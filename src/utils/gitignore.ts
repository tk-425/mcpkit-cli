import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { getProjectGitignorePath } from './paths.js';

const MCPKIT_GITIGNORE_ENTRY = '.mcpkit/';
const MCPKIT_GITIGNORE_BLOCK = `# mcpkit generated local MCP wrappers
${MCPKIT_GITIGNORE_ENTRY}`;

export async function ensureMcpkitGitignoreBlock(): Promise<boolean> {
  const gitignorePath = getProjectGitignorePath();
  const hasFile = existsSync(gitignorePath);
  const existing = hasFile ? await readFile(gitignorePath, 'utf-8') : '';

  const alreadyIgnored = existing
    .split('\n')
    .some((line) => line.trim() === MCPKIT_GITIGNORE_ENTRY);

  if (alreadyIgnored) {
    return false;
  }

  const needsLeadingNewline = existing.length > 0 && !existing.endsWith('\n');
  const nextContent = [
    existing,
    ...(existing.length > 0 ? [needsLeadingNewline ? '\n' : '', '\n'] : []),
    MCPKIT_GITIGNORE_BLOCK,
    '\n',
  ].join('');

  await writeFile(gitignorePath, nextContent, 'utf-8');
  return true;
}
