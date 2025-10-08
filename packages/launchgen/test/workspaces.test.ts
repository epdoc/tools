import { assertEquals } from '@std/assert';
import { join } from '@std/path';
import { afterAll, beforeAll, describe, it } from '@std/testing/bdd';
import { LaunchGenerator } from '../src/mod.ts';

interface LaunchConfig {
  version: string;
  configurations: unknown[];
}

describe('LaunchGenerator with Workspaces', () => {
  let tempDir: string;
  const originalCwd: string = Deno.cwd();

  beforeAll(async () => {
    tempDir = await Deno.makeTempDir();
    Deno.chdir(tempDir);
  });

  afterAll(async () => {
    Deno.chdir(originalCwd);
    if (tempDir) {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  it('should generate launch configs for all workspaces in a monorepo', async () => {
    // Setup mock monorepo project
    const vscodeDir = join(tempDir, '.vscode');
    await Deno.mkdir(vscodeDir, { recursive: true });

    // Root deno.json
    const rootDenoJsonPath = join(tempDir, 'deno.json');
    await Deno.writeTextFile(rootDenoJsonPath, JSON.stringify({
      workspace: ['packages/*'],
    }));

    // Package 1
    const pkg1Dir = join(tempDir, 'packages', 'pkg1');
    await Deno.mkdir(pkg1Dir, { recursive: true });
    const pkg1DenoJsonPath = join(pkg1Dir, 'deno.json');
    await Deno.writeTextFile(pkg1DenoJsonPath, '{}');
    const pkg1SrcDir = join(pkg1Dir, 'src');
    await Deno.mkdir(pkg1SrcDir, { recursive: true });
    const test1File = join(pkg1SrcDir, 'test1.test.ts');
    await Deno.writeTextFile(test1File, '// test file 1');

    // Package 2
    const pkg2Dir = join(tempDir, 'packages', 'pkg2');
    await Deno.mkdir(pkg2Dir, { recursive: true });
    const pkg2DenoJsonPath = join(pkg2Dir, 'deno.json');
    await Deno.writeTextFile(pkg2DenoJsonPath, '{}');
    const pkg2SrcDir = join(pkg2Dir, 'src');
    await Deno.mkdir(pkg2SrcDir, { recursive: true });
    const test2File = join(pkg2SrcDir, 'test2.test.ts');
    await Deno.writeTextFile(test2File, '// test file 2');

    // Run generator
    console.log('DEBUG: Contents of tempDir', Array.from(Deno.readDirSync(tempDir)).map(e => e.name));
    console.log('DEBUG: Contents of pkg1Dir', Array.from(Deno.readDirSync(pkg1Dir)).map(e => e.name));
    console.log('DEBUG: Contents of pkg2Dir', Array.from(Deno.readDirSync(pkg2Dir)).map(e => e.name));
    const generator = new LaunchGenerator(tempDir);
    await generator.run();

    // Check results
    const launchJsonPath = join(vscodeDir, 'launch.json');
    const launchConfig: LaunchConfig = JSON.parse(await Deno.readTextFile(launchJsonPath));

    assertEquals(launchConfig.configurations.length, 2);

    const names = (launchConfig.configurations as any[]).map(c => c.name).sort();
    assertEquals(names, [
      'Debug packages/pkg1/src/test1.test.ts',
      'Debug packages/pkg2/src/test2.test.ts',
    ]);

    const programs = (launchConfig.configurations as any[]).map(c => c.program).sort();
    assertEquals(programs, [
      '${workspaceFolder}/packages/pkg1/src/test1.test.ts',
      '${workspaceFolder}/packages/pkg2/src/test2.test.ts',
    ]);
  });
});
