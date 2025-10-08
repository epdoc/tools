import { assertEquals } from '@std/assert';
import * as path from '@std/path';
import { describe, it } from '@std/testing/bdd';
import { findRoot } from '../src/utils.ts';

describe('findRoot', () => {
  it('should find the project root containing a .vscode folder', async () => {
    const tempDir = await Deno.makeTempDir();
    const projectRoot = path.join(tempDir, 'project');
    const vscodeDir = path.join(projectRoot, '.vscode');
    const nestedDir = path.join(projectRoot, 'src', 'app');

    await Deno.mkdir(vscodeDir, { recursive: true });
    await Deno.mkdir(nestedDir, { recursive: true });

    try {
      const found = await findRoot(nestedDir);
      assertEquals(found, vscodeDir);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
