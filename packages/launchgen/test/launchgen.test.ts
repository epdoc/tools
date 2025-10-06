
import { assertEquals } from '@std/assert';
import { LaunchGenerator } from '../src/launchgen.ts';
import { FolderSpec } from '@epdoc/fs';

interface LaunchConfig {
  version: string;
  configurations: unknown[];
}

Deno.test('LaunchGenerator', async () => {
  const tempDir = await Deno.makeTempDir();
  const originalCwd = Deno.cwd();
  Deno.chdir(tempDir);

  try {
    // Setup mock project
    const vscodeDir = new FolderSpec(tempDir, '.vscode');
    await vscodeDir.ensureDir();
    const denoJson = new FolderSpec(tempDir, 'deno.json');
    await Deno.writeTextFile(denoJson.path, '{"tests": {"include": ["src/**/*"]}}');
    const srcDir = new FolderSpec(tempDir, 'src');
    await srcDir.ensureDir();
    const testFile = new FolderSpec(srcDir, 'my.test.ts');
    await Deno.writeTextFile(testFile.path, '// test file');

    // Run generator
    const generator = new LaunchGenerator(tempDir);
    await generator.run();

    // Check results
    const launchJsonPath = new FolderSpec(vscodeDir, 'launch.json');
    const launchConfig: LaunchConfig = JSON.parse(await Deno.readTextFile(launchJsonPath.path));
    
    assertEquals(launchConfig.configurations.length, 1);
    const config = launchConfig.configurations[0] as any;
    assertEquals(config.name, 'Debug src/my.test.ts');
    assertEquals(config.type, 'deno');
    assertEquals(config.request, 'launch');
    assertEquals(config.program, '${workspaceFolder}/src/my.test.ts');
    assertEquals(config.env.LAUNCHGEN, 'true');
    assertEquals(config.attachSimplePort, 9229);
    assertEquals(config.console, 'internalConsole');
    assertEquals(config.runtimeArgs.includes('--check'), true);

  } finally {
    Deno.chdir(originalCwd);
    await Deno.remove(tempDir, { recursive: true });
  }
});
