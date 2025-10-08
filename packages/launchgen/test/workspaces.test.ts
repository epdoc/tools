import { FileSpec, FolderSpec } from '@epdoc/fs';
import { assertEquals } from '@std/assert';
import { afterAll, beforeAll, describe, it } from '@std/testing/bdd';
import { LaunchGenerator, type LaunchSpecConfig } from '../src/mod.ts';

interface LaunchConfig {
  version: string;
  configurations: unknown[];
}

describe('LaunchGenerator with Workspaces', () => {
  let fsTempFolder: FolderSpec;
  const originalCwd: string = Deno.cwd();

  beforeAll(async () => {
    fsTempFolder = await FolderSpec.makeTemp();
    Deno.chdir(fsTempFolder.path);
  });

  afterAll(async () => {
    Deno.chdir(originalCwd);
    if (fsTempFolder) {
      await fsTempFolder.remove({ recursive: true });
    }
  });

  it('should generate launch configs for all workspaces in a monorepo', async () => {
    // Setup mock monorepo project
    const fsVscodeDir = new FolderSpec(fsTempFolder, '.vscode');
    await fsVscodeDir.ensureDir();

    // Root deno.json
    const fsRootDenoJsonPath = new FileSpec(fsTempFolder, 'deno.json');
    await fsRootDenoJsonPath.writeJson(
      {
        workspace: ['packages/*'],
      },
    );

    // Package 1
    const fsPkg1Dir = new FolderSpec(fsTempFolder, 'packages', 'pkg1');
    await fsPkg1Dir.ensureDir();
    const fsPkg1DenoJsonPath = new FileSpec(fsPkg1Dir, 'deno.json');
    await fsPkg1DenoJsonPath.writeJson({});
    const fsPkg1SrcDir = new FolderSpec(fsPkg1Dir, 'src');
    await fsPkg1SrcDir.ensureDir();
    const fsTest1File = new FileSpec(fsPkg1SrcDir, 'test1.test.ts');
    await Deno.writeTextFile(fsTest1File.path, '// test file 1');
    const fsRun1File = new FileSpec(fsPkg1SrcDir, 'run1.run.ts');
    await Deno.writeTextFile(fsRun1File.path, '// run file 1');

    // Package 2
    const fsPkg2Dir = new FolderSpec(fsTempFolder, 'packages', 'pkg2');
    await fsPkg2Dir.ensureDir();
    const fsPkg2DenoJsonPath = new FileSpec(fsPkg2Dir, 'deno.json');
    await fsPkg2DenoJsonPath.writeJson({});
    const fsPkg2SrcDir = new FolderSpec(fsPkg2Dir, 'src');
    await fsPkg2SrcDir.ensureDir();
    const fsTest2File = new FileSpec(fsPkg2SrcDir, 'test2.test.ts');
    await Deno.writeTextFile(fsTest2File.path, '// test file 2');
    const fsRun2File = new FileSpec(fsPkg2SrcDir, 'run2.run.ts');
    await Deno.writeTextFile(fsRun2File.path, '// run file 2');

    // Run generator
    const generator = new LaunchGenerator(fsTempFolder);
    await generator.run();

    // Check results
    const fsLaunchJsonPath = new FileSpec(fsVscodeDir, 'launch.json');
    const launchConfig = await fsLaunchJsonPath.readJson<LaunchConfig>();

    assertEquals(launchConfig.configurations.length, 4);

    const names = (launchConfig.configurations as LaunchSpecConfig[]).map((c) => c.name).sort();
    assertEquals(names, [
      'Debug pkg1/src/run1.run.ts',
      'Debug pkg1/src/test1.test.ts',
      'Debug pkg2/src/run2.run.ts',
      'Debug pkg2/src/test2.test.ts',
    ]);

    const programs = (launchConfig.configurations as LaunchSpecConfig[]).map((c) => c.program).sort();
    assertEquals(programs, [
      '${workspaceFolder}/packages/pkg1/src/run1.run.ts',
      '${workspaceFolder}/packages/pkg1/src/test1.test.ts',
      '${workspaceFolder}/packages/pkg2/src/run2.run.ts',
      '${workspaceFolder}/packages/pkg2/src/test2.test.ts',
    ]);
  });

  it('should not include files from node_modules directories', async () => {
    // Setup mock monorepo project
    const fsVscodeDir = new FolderSpec(fsTempFolder, '.vscode');
    await fsVscodeDir.ensureDir();

    // Root deno.json
    const fsRootDenoJsonPath = new FileSpec(fsTempFolder, 'deno.json');
    await fsRootDenoJsonPath.writeJson(
      {
        workspace: ['packages/*'],
      },
    );

    // Package 1
    const fsPkg1Dir = new FolderSpec(fsTempFolder, 'packages', 'pkg1');
    await fsPkg1Dir.ensureDir();
    const fsPkg1SrcDir = new FolderSpec(fsPkg1Dir, 'src');
    await fsPkg1SrcDir.ensureDir();

    // Create node_modules within pkg1 and place files inside
    const fsPkg1NodeModulesDir = new FolderSpec(fsPkg1Dir, 'node_modules');
    await fsPkg1NodeModulesDir.ensureDir();
    const fsPkg1NodeModuleTestFile = new FileSpec(fsPkg1NodeModulesDir, 'nm_test.test.ts');
    await Deno.writeTextFile(fsPkg1NodeModuleTestFile.path, '// pkg1 node_modules test file');
    const fsPkg1NodeModuleRunFile = new FileSpec(fsPkg1NodeModulesDir, 'nm_run.run.ts');
    await Deno.writeTextFile(fsPkg1NodeModuleRunFile.path, '// pkg1 node_modules run file');

    // Create node_modules at top level and place files inside
    const fsRootNodeModulesDir = new FolderSpec(fsTempFolder, 'node_modules');
    await fsRootNodeModulesDir.ensureDir();
    const fsRootNodeModuleTestFile = new FileSpec(fsRootNodeModulesDir, 'root_nm_test.test.ts');
    await Deno.writeTextFile(fsRootNodeModuleTestFile.path, '// root node_modules test file');
    const fsRootNodeModuleRunFile = new FileSpec(fsRootNodeModulesDir, 'root_nm_run.run.ts');
    await Deno.writeTextFile(fsRootNodeModuleRunFile.path, '// root node_modules run file');

    // Create a regular test file outside any node_modules
    const fsRegularTestFile = new FileSpec(fsPkg1SrcDir, 'regular.test.ts');
    await Deno.writeTextFile(fsRegularTestFile.path, '// regular test file');

    // Run generator
    const generator = new LaunchGenerator(fsTempFolder);
    await generator.run();

    // Check results
    const fsLaunchJsonPath = new FileSpec(fsVscodeDir, 'launch.json');
    const launchConfig = await fsLaunchJsonPath.readJson<LaunchConfig>();

    // Only the regular test file should be included
    assertEquals(launchConfig.configurations.length, 1);

    const names = (launchConfig.configurations as LaunchSpecConfig[]).map((c) => c.name).sort();
    assertEquals(names, [
      'Debug pkg1/src/regular.test.ts',
    ]);

    const programs = (launchConfig.configurations as LaunchSpecConfig[]).map((c) => c.program).sort();
    assertEquals(programs, [
      '${workspaceFolder}/packages/pkg1/src/regular.test.ts',
    ]);
  });
});
