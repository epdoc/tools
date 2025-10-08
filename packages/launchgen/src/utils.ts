import { FolderSpec } from '@epdoc/fs';
import path from 'node:path';
import { VSCODE } from './consts.ts';

export async function findRoot(fsCwd: FolderSpec, levels: number = 2): Promise<FolderSpec | undefined> {
  for (let i = 0; i < levels; i++) {
    const checkPath = path.resolve(fsCwd.path, ...Array(i).fill('..'));
    const fullVscodePath = path.join(checkPath, VSCODE);
    try {
      const fileInfo = await Deno.lstat(fullVscodePath);
      if (fileInfo.isDirectory) {
        return new FolderSpec(checkPath);
      }
    } catch (_err) {
      // continue
    }
  }
  return undefined;
}
