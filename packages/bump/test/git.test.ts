import { assertEquals } from '@std/assert';
import { Git } from '../src/git.ts';
import { Context } from '../src/context.ts';
import { FolderSpec } from '@epdoc/fs';

Deno.test('Git.add with workspace files', async (t) => {
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

    // --- Test Step: deno.json ---
    await t.step('deno.json', async () => {
      // Create workspace structure
      const packagesDir = new FolderSpec(tempDir, 'packages');
      await packagesDir.ensureDir();
      const bumpDir = new FolderSpec(packagesDir, 'bump');
      await bumpDir.ensureDir();

      // Create and modify files
      const rootDenoJson = new FolderSpec(tempDir, 'deno.json');
      await Deno.writeTextFile(rootDenoJson.path, '{"name": "root", "version": "1.0.0"}');
      const bumpDenoJson = new FolderSpec(bumpDir, 'deno.json');
      await Deno.writeTextFile(bumpDenoJson.path, '{"name": "bump", "version": "0.1.0"}');
      Deno.chdir(tempDir);
      await git.run(['add', '-A']);
      await git.commit(['Initial commit']);
      Deno.chdir(bumpDir.path);

      await Deno.writeTextFile(rootDenoJson.path, '{"name": "root", "version": "1.0.1"}');
      await Deno.writeTextFile(bumpDenoJson.path, '{"name": "bump", "version": "0.1.1"}');

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

      assertEquals(stagedFiles.includes('packages/bump/deno.json'), true);
      assertEquals(stagedFiles.includes('deno.json'), true);
    });

    // --- Test Step: README.md ---
    await t.step('README.md', async () => {
      // Create and modify files
      const rootReadme = new FolderSpec(tempDir, 'README.md');
      await Deno.writeTextFile(rootReadme.path, '# Root README');
      const bumpReadme = new FolderSpec(tempDir, 'packages/bump/README.md');
      await Deno.writeTextFile(bumpReadme.path, '# Bump README');
      await git.run(['add', '-A']);
      await git.commit(['Second commit']);

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
    });

    // --- Test Step: docs/ ---
    await t.step('docs/', async () => {
      // Create and modify files
      const docsDir = new FolderSpec(tempDir, 'docs');
      await docsDir.ensureDir();
      const docFile = new FolderSpec(docsDir, 'guide.md');
      await Deno.writeTextFile(docFile.path, '# Guide');
      const bumpFile = new FolderSpec(tempDir, 'packages/bump/somefile.ts');
      await Deno.writeTextFile(bumpFile.path, '// some content');
      await git.run(['add', '-A']);
      await git.commit(['Third commit']);

      await Deno.writeTextFile(docFile.path, '# Guide (modified)');
      await Deno.writeTextFile(bumpFile.path, '// some content (modified)');

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

      assertEquals(stagedFiles.includes('packages/bump/somefile.ts'), true);
      assertEquals(stagedFiles.includes('docs/guide.md'), true);
    });
  } finally {
    Deno.chdir(originalCwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});
