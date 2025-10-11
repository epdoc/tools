import { describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';
import { FileSpec, FolderSpec } from '@epdoc/fs';
import { ConfigLoader } from '../src/config-loader.ts';

async function createTempDir(): Promise<FolderSpec> {
  const tempDir = await Deno.makeTempDir({ prefix: 'config_loader_test_' });
  return new FolderSpec(tempDir);
}

describe('ConfigLoader', () => {
  it('loads from deno.json only', async () => {
    const tempDir = await createTempDir();

    try {
      const denoJsonFile = new FileSpec(tempDir, 'deno.json');
      await denoJsonFile.writeJson({
        name: 'test-project',
        launch: {
          port: 9229,
          console: 'internalConsole',
          groups: [
            {
              id: 'test',
              name: 'Tests',
              includes: ['**/*.test.ts'],
              runtimeArgs: ['test', '-A'],
            },
          ],
        },
      });

      const configLoader = new ConfigLoader();
      const config = await configLoader.loadAndMerge(tempDir);

      expect(config.port).toBe(9229);
      expect(config.console).toBe('internalConsole');
      expect(config.groups).toHaveLength(1);
      expect(config.groups?.[0].id).toBe('test');
      expect(config.groups?.[0].name).toBe('Tests');
    } finally {
      await Deno.remove(tempDir.path, { recursive: true });
    }
  });

  it('auto-generates config when none exists', async () => {
    const tempDir = await createTempDir();

    try {
      const denoJsonFile = new FileSpec(tempDir, 'deno.json');
      await denoJsonFile.writeJson({
        name: 'test-project',
        version: '1.0.0',
      });

      const configLoader = new ConfigLoader();
      const config = await configLoader.loadAndMerge(tempDir);

      expect(config.groups).toHaveLength(2);
      expect(config.port).toBe(9229);
      expect(config.console).toBe('internalConsole');

      const testGroup = config.groups?.find((g) => g.id === 'test');
      const runGroup = config.groups?.find((g) => g.id === 'run');

      expect(testGroup).toBeDefined();
      expect(runGroup).toBeDefined();
      expect(testGroup!.name).toBe('Tests');
      expect(testGroup!.includes).toEqual(['**/*.test.ts']);

      const launchConfigFile = new FileSpec(tempDir, 'launch.config.json');
      expect(await launchConfigFile.getIsFile()).toBe(true);
    } finally {
      await Deno.remove(tempDir.path, { recursive: true });
    }
  });
});
