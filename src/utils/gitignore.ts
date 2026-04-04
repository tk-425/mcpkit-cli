import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { getProjectGitignorePath } from './paths.js';

const MCPKIT_GITIGNORE_BLOCK = `# BEGIN MCPKIT
# mcpkit generated local MCP wrappers
.mcpkit/
# END MCPKIT`;

export async function ensureMcpkitGitignoreBlock(): Promise<boolean> {
  const gitignorePath = getProjectGitignorePath();
  const hasFile = existsSync(gitignorePath);
  const existing = hasFile ? await readFile(gitignorePath, 'utf-8') : '';

  if (existing.includes(MCPKIT_GITIGNORE_BLOCK)) {
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
