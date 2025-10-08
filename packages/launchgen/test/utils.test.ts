import { assertEquals } from '@std/assert';
import { join } from '@std/path';
import { afterAll, beforeAll, beforeEach, afterEach, describe, it } from '@std/testing/bdd';
import { findRoot } from '../src/utils.ts';
import { VSCODE } from '../src/consts.ts';

describe('findRoot', () => {
  let tempDir: string;
  const originalCwd: string = Deno.cwd();

  beforeEach(async () => {
    tempDir = await Deno.makeTempDir();
    Deno.chdir(tempDir);
  });

  afterEach(async () => {
    Deno.chdir(originalCwd);
    if (tempDir) {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  it('should find the root at the current working directory', async () => {
    const vscodePath = join(tempDir, VSCODE);
    await Deno.mkdir(vscodePath, { recursive: true });
    const root = await findRoot(tempDir);
    assertEquals(root, tempDir);
  });

  it('should find the root in a parent directory', async () => {
    const parentDir = join(tempDir, 'parent');
    const childDir = join(parentDir, 'child');
    const vscodePath = join(parentDir, VSCODE);

    await Deno.mkdir(childDir, { recursive: true });
    await Deno.mkdir(vscodePath, { recursive: true });

    const root = await findRoot(childDir, 2);
    assertEquals(root, parentDir);
  });

  it('should return undefined if .vscode is not found', async () => {
    const root = await findRoot(tempDir);
    assertEquals(root, undefined);
  });

  it('should return undefined if .vscode is beyond the specified levels', async () => {
    const parentDir = join(tempDir, 'parent');
    const grandParentDir = join(tempDir, 'grandparent');
    const vscodePath = join(grandParentDir, VSCODE);

    await Deno.mkdir(parentDir, { recursive: true });
    await Deno.mkdir(vscodePath, { recursive: true });

    const root = await findRoot(parentDir, 1); // Only search 1 level up
    assertEquals(root, undefined);
  });

  it('should find the root when .vscode is in a grandparent directory', async () => {
    const parentDir = join(tempDir, 'parent');
    const childDir = join(parentDir, 'child');
    const vscodePath = join(tempDir, VSCODE); // .vscode in tempDir (grandparent to childDir)

    await Deno.mkdir(childDir, { recursive: true });
    await Deno.mkdir(vscodePath, { recursive: true });

    const root = await findRoot(childDir, 3); // Search 3 levels up
    assertEquals(root, tempDir);
  });
});