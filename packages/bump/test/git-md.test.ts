import { assertEquals } from '@std/assert';
import { Git } from '../src/git.ts';
import { Context } from '../src/context.ts';
import { FolderSpec } from '@epdoc/fs';

Deno.test('Git.add with workspace markdown files', async () => {
  const tempDir = await Deno.makeTempDir();
  const originalCwd = Deno.cwd();
  Deno.chdir(tempDir);

  try {
    const ctx = new Context();
    const git = new Git(ctx);

    // Initialize git repo
    await git.run(['init']);
    await git.run(['config', 'user.email', 'test@example.com']);
    await git.run(['config', 'user.name', 'Test User']);

    // Create workspace structure
    const packagesDir = new FolderSpec(tempDir, 'packages');
    await packagesDir.ensureDir();
    const bumpDir = new FolderSpec(packagesDir, 'bump');
    await bumpDir.ensureDir();

    // Create and modify files
    const rootReadme = new FolderSpec(tempDir, 'README.md');
    await Deno.writeTextFile(rootReadme.path, '# Root README');
    const bumpReadme = new FolderSpec(bumpDir, 'README.md');
    await Deno.writeTextFile(bumpReadme.path, '# Bump README');
    Deno.chdir(tempDir);
    await git.run(['add', '-A']);
    await git.commit(['Initial commit']);
    Deno.chdir(bumpDir.path);

    await Deno.writeTextFile(rootReadme.path, '# Root README (modified)');
    await Deno.writeTextFile(bumpReadme.path, '# Bump README (modified)');

    // Run the add method
    const git2 = new Git(ctx);
    await git2.add();

    // Check staged files
    const statusOutput = await git.runWithOutput(['status', '--porcelain']);
    const stagedFiles = statusOutput.split('\n').filter((line) => {
      const trimmed = line.trim();
      return trimmed.startsWith('M') || trimmed.startsWith('A');
    }).map((line) => {
      return line.trim().split(' ').pop() || '';
    });

    assertEquals(stagedFiles.includes('packages/bump/README.md'), true);
    assertEquals(stagedFiles.includes('README.md'), true);
  } finally {
    Deno.chdir(originalCwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});
