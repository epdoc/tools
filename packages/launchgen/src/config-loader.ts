import { FileSpec, type FolderSpec } from '@epdoc/fs';
import {
  DENO_JSON_FILE,
  LAUNCH_CONFIG_FILE,
  DEFAULT_CONSOLE,
  DEFAULT_TEST_ARGS,
  DEFAULT_RUNTIME_ARGS,
  DEFAULT_EXCLUDES,
  RUNTIME_EXECUTABLE,
  LAUNCH_SCHEMA_URL
} from './consts.ts';
import type { DenoJson, Group, LaunchConfig } from './types.ts';

export class ConfigLoader {
  async loadAndMerge(workspaceDir: FolderSpec, forceRegenerate = false, isProjectRoot = false): Promise<LaunchConfig> {
    const denoJsonFile = new FileSpec(workspaceDir, DENO_JSON_FILE);
    const launchConfigFile = new FileSpec(workspaceDir, LAUNCH_CONFIG_FILE);

    let config: LaunchConfig = {};

    // Load from deno.json
    if (await denoJsonFile.getIsFile()) {
      const denoJson = await denoJsonFile.readJson<DenoJson>();
      if (denoJson.launch) {
        config = { ...denoJson.launch };
      }
    }

    // Load and merge from launch.config.json
    if (await launchConfigFile.getIsFile() && !forceRegenerate) {
      const launchConfig = await launchConfigFile.readJson<{ launch: LaunchConfig }>();
      if (launchConfig.launch) {
        config = this.mergeConfigs(config, launchConfig.launch);
      }
    }

    // Auto-generate if no configuration exists or if forced
    const shouldAutoGenerate = forceRegenerate || (!config.groups &&
      !(await denoJsonFile.getIsFile() && await this.#hasLaunchProperty(denoJsonFile)));

    if (shouldAutoGenerate) {
      await this.#autoGenerateConfig(workspaceDir, denoJsonFile, isProjectRoot);
      // Reload the config after auto-generation
      if (await launchConfigFile.getIsFile()) {
        const launchConfig = await launchConfigFile.readJson<{ launch: LaunchConfig }>();
        if (launchConfig.launch) {
          config = this.mergeConfigs(config, launchConfig.launch);
        }
      }
    }

    return config;
  }

  async #hasLaunchProperty(denoJsonFile: FileSpec): Promise<boolean> {
    const denoJson = await denoJsonFile.readJson<DenoJson>();
    return !!denoJson.launch;
  }

  protected mergeConfigs(base: LaunchConfig, override: LaunchConfig): LaunchConfig {
    const merged: LaunchConfig = { ...base };

    if (override.port !== undefined) merged.port = override.port;
    if (override.console !== undefined) merged.console = override.console;
    if (override.excludes !== undefined) merged.excludes = override.excludes;

    if (override.groups) {
      const baseGroups = base.groups || [];
      const mergedGroups: Group[] = [...baseGroups];

      for (const overrideGroup of override.groups) {
        const existingIndex = mergedGroups.findIndex((g) => g.id === overrideGroup.id);
        if (existingIndex >= 0) {
          mergedGroups[existingIndex] = { ...mergedGroups[existingIndex], ...overrideGroup };
        } else {
          mergedGroups.push(overrideGroup);
        }
      }
      merged.groups = mergedGroups;
    }

    return merged;
  }

  async #autoGenerateConfig(workspaceDir: FolderSpec, denoJsonFile: FileSpec, isProjectRoot: boolean): Promise<void> {
    let groups: Group[] = [];
    if (!isProjectRoot) {
      groups = [
        {
          id: 'test',
          name: 'Tests',
          console: DEFAULT_CONSOLE,
          includes: ['**/*.test.ts'],
          runtimeArgs: DEFAULT_TEST_ARGS,
        },
        {
          id: 'run',
          name: 'Runnable',
          console: DEFAULT_CONSOLE,
          includes: ['**/*.run.ts'],
          runtimeArgs: DEFAULT_RUNTIME_ARGS,
        },
      ];

      // Add executable exports
      if (await denoJsonFile.getIsFile()) {
        const denoJson = await denoJsonFile.readJson<DenoJson>();
        if (denoJson.exports) {
          for (const [key, filePath] of Object.entries(denoJson.exports)) {
            if (!filePath.endsWith('mod.ts')) {
              const name = key === '.' ? filePath.replace(/^\.\//, '').replace(/\.ts$/, '') : key;
              groups.push({
                id: key,
                name: name,
                console: DEFAULT_CONSOLE,
                program: filePath,
                runtimeArgs: DEFAULT_RUNTIME_ARGS,
                scripts: ['', '--help'],
              });
            }
          }
        }
      }
    }

    const launchConfigFile = new FileSpec(workspaceDir, LAUNCH_CONFIG_FILE);
    await launchConfigFile.writeJson({
      '$schema': LAUNCH_SCHEMA_URL,
      launch: {
        port: 9229,
        console: DEFAULT_CONSOLE,
        excludes: DEFAULT_EXCLUDES,
        runtimeExecutable: Deno.execPath(),
        groups: groups,
      },
    }, null, 2);
  }
}
