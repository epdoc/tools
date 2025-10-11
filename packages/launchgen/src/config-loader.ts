import { FileSpec, type FolderSpec } from '@epdoc/fs';
import type { DenoJson, Group, LaunchConfig } from './types.ts';

export class ConfigLoader {
  async loadAndMerge(workspaceDir: FolderSpec, forceRegenerate = false, isProjectRoot = false): Promise<LaunchConfig> {
    const denoJsonFile = new FileSpec(workspaceDir, 'deno.json');
    const launchConfigFile = new FileSpec(workspaceDir, 'launch.config.json');

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

    // Auto-generate if no configuration exists or if forced (only at project root)
    const shouldAutoGenerate = isProjectRoot && (forceRegenerate || (!config.groups &&
      !(await denoJsonFile.getIsFile() && await this.#hasLaunchProperty(denoJsonFile))));

    if (shouldAutoGenerate) {
      await this.#autoGenerateConfig(workspaceDir, denoJsonFile);
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

  async #autoGenerateConfig(workspaceDir: FolderSpec, denoJsonFile: FileSpec): Promise<void> {
    const groups: Group[] = [
      {
        id: 'test',
        name: 'Tests',
        includes: ['**/*.test.ts'],
        runtimeArgs: ['test', '-A', '--inspect-brk'],
      },
      {
        id: 'run',
        name: 'Runnable',
        includes: ['**/*.run.ts'],
        runtimeArgs: ['run', '-A', '--inspect-brk'],
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
              program: filePath,
              runtimeArgs: ['run', '-A', '--inspect-brk'],
              scripts: [''],
            });
          }
        }
      }
    }

    const launchConfigFile = new FileSpec(workspaceDir, 'launch.config.json');
    await launchConfigFile.writeJson({
      launch: {
        port: 9229,
        console: 'internalConsole',
        excludes: ['node_modules/**', '.git/**', '**/.*', '**/.*/**'],
        groups,
      },
    });
  }
}
