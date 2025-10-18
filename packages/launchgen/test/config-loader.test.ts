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

  it('auto-generates minimal config at root', async () => {
    const tempDir = await createTempDir();

    try {
      const denoJsonFile = new FileSpec(tempDir, 'deno.json');
      await denoJsonFile.writeJson({
        name: 'test-project',
        version: '1.0.0',
      });

      const configLoader = new ConfigLoader();
      const config = await configLoader.loadAndMerge(tempDir, false, true);

      expect(config.groups).toHaveLength(0);
      expect(config.port).toBe(9229);
      expect(config.console).toBe('internalConsole');

      const launchConfigFile = new FileSpec(tempDir, 'launch.config.json');
      expect(await launchConfigFile.getIsFile()).toBe(true);
      const launchConfig = await launchConfigFile.readJson<{ launch: { groups: unknown[] } }>();
      expect(launchConfig.launch.groups).toHaveLength(0);
    } finally {
      await Deno.remove(tempDir.path, { recursive: true });
    }
  });

  it('auto-generates full config in workspace', async () => {
    const tempDir = await createTempDir();

    try {
      const workspaceDir = new FolderSpec(tempDir, 'workspace');
      await workspaceDir.ensureDir();
      const denoJsonFile = new FileSpec(workspaceDir, 'deno.json');
      await denoJsonFile.writeJson({
        name: 'test-workspace',
        version: '1.0.0',
      });

      const configLoader = new ConfigLoader();
      const config = await configLoader.loadAndMerge(workspaceDir, false, false);

      expect(config.groups).toHaveLength(2);
      const testGroup = config.groups?.find((g) => g.id === 'test');
      expect(testGroup).toBeDefined();
    } finally {
      await Deno.remove(tempDir.path, { recursive: true });
    }
  });

  it('auto-generates config with exports and variants', async () => {
    const tempDir = await createTempDir();

    try {
      const workspaceDir = new FolderSpec(tempDir, 'workspace');
      await workspaceDir.ensureDir();
      const denoJsonFile = new FileSpec(workspaceDir, 'deno.json');
      await denoJsonFile.writeJson({
        name: 'test-workspace',
        version: '1.0.0',
        exports: {
          '.': './main.ts',
        },
      });

      const configLoader = new ConfigLoader();
      const config = await configLoader.loadAndMerge(workspaceDir, false, false);

      expect(config.groups).toHaveLength(3); // test, run, and export
      const exportGroup = config.groups?.find((g) => g.id === '.');
      expect(exportGroup).toBeDefined();
      expect(exportGroup?.scripts).toEqual(['', '--help']);
    } finally {
      await Deno.remove(tempDir.path, { recursive: true });
    }
  });
});
