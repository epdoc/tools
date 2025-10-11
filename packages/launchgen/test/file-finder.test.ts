import { describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';
import { FileSpec, FolderSpec } from '@epdoc/fs';
import { FileFinder } from '../src/file-finder.ts';

async function createTempDir(): Promise<FolderSpec> {
  const tempDir = await Deno.makeTempDir({ prefix: 'file_finder_test_' });
  return new FolderSpec(tempDir);
}

async function createTestFileStructure(root: FolderSpec): Promise<void> {
  // Create various test files
  const files = [
    'src/utils.test.ts',
    'src/main.test.ts',
    'tests/integration.test.ts',
    'tests/unit.test.js',
    'scripts/deploy.run.ts',
    'scripts/build.run.js',
    'lib/helper.ts',
    'lib/types.ts',
    'docs/readme.md',
    'node_modules/package/index.js',
  ];

  for (const filePath of files) {
    const pathParts = filePath.split('/');
    const fileName = pathParts.pop()!;
    const dirPath = pathParts;

    const dir = new FolderSpec(root, ...dirPath);
    await dir.ensureDir();

    const file = new FileSpec(dir, fileName);
    await Deno.writeTextFile(file.path, `// ${filePath}`);
  }
}

describe('FileFinder', () => {
  it('finds files with single include pattern', async () => {
    const tempDir = await createTempDir();

    try {
      await createTestFileStructure(tempDir);

      const fileFinder = new FileFinder();
      const files = await fileFinder.findFiles(tempDir, ['**/*.test.ts']);

      expect(files).toHaveLength(3);

      const filePaths = files.map((f) => f.path.substring(tempDir.path.length + 1)).sort();
      expect(filePaths).toEqual([
        'src/main.test.ts',
        'src/utils.test.ts',
        'tests/integration.test.ts',
      ]);
    } finally {
      await Deno.remove(tempDir.path, { recursive: true });
    }
  });

  it('finds files with multiple include patterns', async () => {
    const tempDir = await createTempDir();

    try {
      await createTestFileStructure(tempDir);

      const fileFinder = new FileFinder();
      const files = await fileFinder.findFiles(tempDir, ['**/*.test.ts', '**/*.run.ts']);

      expect(files).toHaveLength(4);

      const filePaths = files.map((f) => f.path.substring(tempDir.path.length + 1)).sort();
      expect(filePaths).toEqual([
        'scripts/deploy.run.ts',
        'src/main.test.ts',
        'src/utils.test.ts',
        'tests/integration.test.ts',
      ]);
    } finally {
      await Deno.remove(tempDir.path, { recursive: true });
    }
  });

  it('excludes files with exclude patterns', async () => {
    const tempDir = await createTempDir();

    try {
      await createTestFileStructure(tempDir);

      const fileFinder = new FileFinder();
      const files = await fileFinder.findFiles(
        tempDir,
        ['**/*.test.*'],
        ['**/integration.*'],
      );

      expect(files).toHaveLength(3); // Excludes integration.test.ts

      const filePaths = files.map((f) => f.path.substring(tempDir.path.length + 1)).sort();
      expect(filePaths).toEqual([
        'src/main.test.ts',
        'src/utils.test.ts',
        'tests/unit.test.js',
      ]);
    } finally {
      await Deno.remove(tempDir.path, { recursive: true });
    }
  });

  it('excludes node_modules by pattern', async () => {
    const tempDir = await createTempDir();

    try {
      await createTestFileStructure(tempDir);

      const fileFinder = new FileFinder();
      const files = await fileFinder.findFiles(
        tempDir,
        ['**/*.js'],
        ['node_modules/**'],
      );

      expect(files).toHaveLength(2); // build.run.js and unit.test.js, but not node_modules/package/index.js

      const filePaths = files.map((f) => f.path.substring(tempDir.path.length + 1)).sort();
      expect(filePaths).toEqual(['scripts/build.run.js', 'tests/unit.test.js']);
    } finally {
      await Deno.remove(tempDir.path, { recursive: true });
    }
  });

  it('handles specific directory patterns', async () => {
    const tempDir = await createTempDir();

    try {
      await createTestFileStructure(tempDir);

      const fileFinder = new FileFinder();
      const files = await fileFinder.findFiles(tempDir, ['src/**/*.ts']);

      expect(files).toHaveLength(2);

      const filePaths = files.map((f) => f.path.substring(tempDir.path.length + 1)).sort();
      expect(filePaths).toEqual([
        'src/main.test.ts',
        'src/utils.test.ts',
      ]);
    } finally {
      await Deno.remove(tempDir.path, { recursive: true });
    }
  });

  it('returns empty array when no matches', async () => {
    const tempDir = await createTempDir();

    try {
      await createTestFileStructure(tempDir);

      const fileFinder = new FileFinder();
      const files = await fileFinder.findFiles(tempDir, ['**/*.nonexistent']);

      expect(files).toHaveLength(0);
    } finally {
      await Deno.remove(tempDir.path, { recursive: true });
    }
  });

  it('handles empty includes array', async () => {
    const tempDir = await createTempDir();

    try {
      await createTestFileStructure(tempDir);

      const fileFinder = new FileFinder();
      const files = await fileFinder.findFiles(tempDir, []);

      expect(files).toHaveLength(0);
    } finally {
      await Deno.remove(tempDir.path, { recursive: true });
    }
  });

  it('handles complex glob patterns', async () => {
    const tempDir = await createTempDir();

    try {
      // Create more complex structure
      const complexFiles = [
        'src/components/Button.test.tsx',
        'src/components/Input.test.tsx',
        'src/utils/helpers.test.ts',
        'src/utils/validators.spec.ts',
        'tests/e2e/login.test.ts',
        'tests/unit/auth.test.ts',
      ];

      for (const filePath of complexFiles) {
        const pathParts = filePath.split('/');
        const fileName = pathParts.pop()!;
        const dirPath = pathParts;

        const dir = new FolderSpec(tempDir, ...dirPath);
        await dir.ensureDir();

        const file = new FileSpec(dir, fileName);
        await Deno.writeTextFile(file.path, `// ${filePath}`);
      }

      const fileFinder = new FileFinder();

      // Find all test files but exclude e2e tests
      const files = await fileFinder.findFiles(
        tempDir,
        ['**/*.test.*', '**/*.spec.*'],
        ['**/e2e/**'],
      );

      expect(files).toHaveLength(5); // All except e2e/login.test.ts

      const filePaths = files.map((f) => f.path.substring(tempDir.path.length + 1)).sort();
      expect(filePaths).toEqual([
        'src/components/Button.test.tsx',
        'src/components/Input.test.tsx',
        'src/utils/helpers.test.ts',
        'src/utils/validators.spec.ts',
        'tests/unit/auth.test.ts',
      ]);
    } finally {
      await Deno.remove(tempDir.path, { recursive: true });
    }
  });
});
