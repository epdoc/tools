import { join, resolve } from '@std/path';
import consts from './consts.ts';

export async function findRoot(cwd: string, levels: number = 2): Promise<string | undefined> {
  for (let i = 0; i <= levels; i++) {
    const checkPath = resolve(cwd, ...Array(i).fill('..'));
    const vscodePath = join(checkPath, consts.VSCODE);
    try {
      const isDir = (await Deno.stat(vscodePath)).isDirectory;
      if (isDir) {
        return vscodePath;
      }
    } catch (_err) {
      // continue
    }
  }
  return undefined;
}
