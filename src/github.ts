import * as fs from 'fs/promises';
import * as path from 'path';
import { getJson, getText } from './fetcher';

const REPO_OWNER = 'uFerris-rs';
const REPO_NAME = 'uferris-extension';
const BRANCH = 'main';
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;

interface GitHubEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
}

export async function listExamplesForBoard(board: string): Promise<string[]> {
  const entries = await getJson<GitHubEntry[]>(
    `${API_BASE}/examples/${board}?ref=${BRANCH}`
  );
  return entries.filter((e) => e.type === 'dir').map((e) => e.name);
}

export async function downloadExample(
  board: string,
  exampleName: string,
  destDir: string
): Promise<void> {
  async function downloadDir(remotePath: string, localPath: string): Promise<void> {
    await fs.mkdir(localPath, { recursive: true });
    const entries = await getJson<GitHubEntry[]>(
      `${API_BASE}/${remotePath}?ref=${BRANCH}`
    );
    for (const entry of entries) {
      const entryLocal = path.join(localPath, entry.name);
      if (entry.type === 'dir') {
        await downloadDir(entry.path, entryLocal);
      } else if (entry.type === 'file' && entry.download_url) {
        const content = await getText(entry.download_url);
        await fs.writeFile(entryLocal, content, 'utf8');
      }
    }
  }

  await downloadDir(`examples/${board}/${exampleName}`, destDir);
}
