import { FolderSpec } from '@epdoc/fs';
import { assert, assertEquals } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { VSCODE } from '../src/consts.ts';
import { findRoot } from '../src/utils.ts';

describe('findRoot', () => {
  let fsTempFolder: FolderSpec;
  const originalCwd: string = Deno.cwd();

  beforeEach(async () => {
    fsTempFolder = await FolderSpec.makeTemp();
    Deno.chdir(fsTempFolder.path);
  });

  afterEach(async () => {
    Deno.chdir(originalCwd);
    if (fsTempFolder) {
      await fsTempFolder.remove({ recursive: true });
    }
  });

  it('should find the root at the current working directory', async () => {
    const fsVscodeFolder = new FolderSpec(fsTempFolder, VSCODE);
    await fsVscodeFolder.ensureDir();
    const root = await findRoot(fsTempFolder);
    assert(root);
    assertEquals(root.path, fsTempFolder.path);
  });

  it('should find the root in a parent directory', async () => {
    const parentDir = new FolderSpec(fsTempFolder, 'parent');
    const childDir = new FolderSpec(parentDir, 'child');
    const vscodePath = new FolderSpec(parentDir, VSCODE);
    await parentDir.ensureDir(); // Ensure parentDir exists
    await childDir.ensureDir();
    await vscodePath.ensureDir();
    const root = await findRoot(childDir, 2);
    assert(root);
    assertEquals(root.path, parentDir.path);
  });

  it('should return undefined if .vscode is not found', async () => {
    const root = await findRoot(fsTempFolder);
    assertEquals(root, undefined);
  });

  it('should return undefined if .vscode is beyond the specified levels', async () => {
    const parentDir = new FolderSpec(fsTempFolder, 'parent');
    const grandParentDir = new FolderSpec(fsTempFolder, 'grandparent');
    const vscodePath = new FolderSpec(grandParentDir, VSCODE);

    await parentDir.ensureDir();
    await vscodePath.ensureDir();

    const root = await findRoot(parentDir, 1); // Only search 1 level up
    assertEquals(root, undefined);
  });

  it('should find the root when .vscode is in a grandparent directory', async () => {
    const parentDir = new FolderSpec(fsTempFolder, 'parent');
    const childDir = new FolderSpec(parentDir, 'child');
    const vscodePath = new FolderSpec(fsTempFolder, VSCODE); // .vscode in tempDir (grandparent to childDir)

    await childDir.ensureDir();
    await vscodePath.ensureDir();

    const root = await findRoot(childDir, 3); // Search 3 levels up
    assert(root);
    assertEquals(root.path, fsTempFolder.path);
  });
});
