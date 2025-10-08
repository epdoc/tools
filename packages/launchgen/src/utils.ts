import path from 'node:path';
import { VSCODE } from './consts.ts';

export async function findRoot(cwd: string, levels: number = 2): Promise<string | undefined> {
  for (let i = 0; i < levels; i++) {
    const checkPath = path.resolve(cwd, ...Array(i).fill('..'));
    try {
      const fileInfo = await Deno.lstat(path.join(checkPath, VSCODE));
      if (fileInfo.isDirectory) {
        return checkPath;
      }
    } catch (_err) {
      // continue
    }
  }
  return undefined;
}
