import { FileSpec, FolderSpec } from '@epdoc/fs';
import { assert, assertEquals } from '@std/assert';
import { LaunchGenerator, type LaunchSpecConfig } from '../src/mod.ts';

interface LaunchConfig {
  version: string;
  configurations: unknown[];
}

Deno.test('LaunchGenerator', async () => {
  const fsTempFolder = await FolderSpec.makeTemp();
  const originalCwd = Deno.cwd();
  Deno.chdir(fsTempFolder.path);

  try {
    // Setup mock project
    const fsVscodeFolder = new FolderSpec(fsTempFolder, '.vscode');
    await fsVscodeFolder.ensureDir();
    const denoJson = new FileSpec(fsTempFolder, 'deno.json');
    denoJson.writeJson({ tests: { include: ['src/**/*'] } });
    const fsSrcFolder = new FolderSpec(fsTempFolder, 'src');
    await fsSrcFolder.ensureDir();
    const testFile = new FileSpec(fsSrcFolder, 'my.test.ts');
    await testFile.write('// test file');

    // Run generator
    const generator = new LaunchGenerator(fsTempFolder);
    await generator.run();

    // Check results
    const launchJsonPath = new FileSpec(fsVscodeFolder, 'launch.json');
    const launchConfig = await launchJsonPath.readJson<LaunchConfig>();

    assertEquals(launchConfig.configurations.length, 1);
    const config = launchConfig.configurations[0] as LaunchSpecConfig;
    assertEquals(config.name, 'Debug src/my.test.ts');
    assertEquals(config.type, 'deno');
    assertEquals(config.request, 'launch');
    assertEquals(config.program, '${workspaceFolder}/src/my.test.ts');
    assert(config.env);
    assertEquals(config.env.LAUNCHGEN, 'true');
    assertEquals(config.attachSimplePort, 9229);
    assertEquals(config.console, 'internalConsole');
    assert(config.runtimeArgs);
    assertEquals(config.runtimeArgs.includes('--check'), true);
  } finally {
    Deno.chdir(originalCwd);
    await fsTempFolder.remove({ recursive: true });
  }
});
