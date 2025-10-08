import { assert, assertEquals } from '@std/assert';
import { join } from '@std/path';
import { afterAll, beforeAll, describe, it } from '@std/testing/bdd';
import { LaunchGenerator, type LaunchSpecConfig } from '../src/mod.ts';

interface LaunchConfig {
  version: string;
  configurations: unknown[];
}

describe('LaunchGenerator', () => {
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

  it('should generate launch config for a test file', async () => {
    // Setup mock project
    const vscodeDir = join(tempDir, '.vscode');
    await Deno.mkdir(vscodeDir, { recursive: true });
    const denoJsonPath = join(tempDir, 'deno.json');
    await Deno.writeTextFile(denoJsonPath, '{"tests": {"include": ["src/**/*"]}}');
    const srcDir = join(tempDir, 'src');
    await Deno.mkdir(srcDir, { recursive: true });
    const testFile = join(srcDir, 'my.test.ts');
    await Deno.writeTextFile(testFile, '// test file');

    // Run generator
    const generator = new LaunchGenerator(tempDir);
    await generator.run();

    // Check results
    const launchJsonPath = join(vscodeDir, 'launch.json');
    const launchConfig: LaunchConfig = JSON.parse(await Deno.readTextFile(launchJsonPath));

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
  });
});
