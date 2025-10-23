import { FileSpec, type FolderSpec } from '@epdoc/fs';
import { _ } from '@epdoc/type';
import {
  DEFAULT_CONSOLE,
  DEFAULT_EXCLUDES,
  DEFAULT_RUNTIME_ARGS,
  DEFAULT_TEST_ARGS,
  DENO_JSON_FILE,
  LAUNCH_CONFIG_FILE,
  LAUNCH_SCHEMA_URL,
} from './consts.ts';
import type { DenoJson, Group, LaunchConfig } from './types.ts';
import { isMainEntryPoint } from './utils.ts';

export class ConfigLoader {
  async loadAndMerge(workspaceDir: FolderSpec, forceRegenerate = false, isProjectRoot = false): Promise<LaunchConfig> {
    const denoJsonFile = new FileSpec(workspaceDir, DENO_JSON_FILE);
    const launchConfigFile = new FileSpec(workspaceDir, LAUNCH_CONFIG_FILE);

    let config: LaunchConfig = {};

    // Load from deno.json
    const isDenoJsonAFile = await denoJsonFile.isFile();
    let denoJsonHasLaunchProperty = false;
    if (isDenoJsonAFile) {
      const denoJson = await denoJsonFile.readJson<DenoJson>();
      if (denoJson.launch) {
        denoJsonHasLaunchProperty = true;
        config = { ...denoJson.launch };
      }
    }

    // Load and merge from launch.config.json
    if (await launchConfigFile.isFile() && !forceRegenerate) {
      const launchConfig = await launchConfigFile.readJson<{ launch: LaunchConfig }>();
      if (launchConfig.launch) {
        config = this.mergeConfigs(config, launchConfig.launch);
      }
    }

    // Auto-generate if no configuration exists or if forced
    const shouldAutoGenerate = forceRegenerate || (!config.groups && !(isDenoJsonAFile && denoJsonHasLaunchProperty));

    if (shouldAutoGenerate) {
      await this.#autoGenerateConfig(workspaceDir, denoJsonFile, isProjectRoot);
      // Reload the config after auto-generation
      if (await launchConfigFile.isFile()) {
        const launchConfig = await launchConfigFile.readJson<{ launch: LaunchConfig }>();
        if (launchConfig.launch) {
          config = this.mergeConfigs(config, launchConfig.launch);
        }
      }
    }

    return config;
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
    const denoJson = await denoJsonFile.isFile() ? await denoJsonFile.readJson<DenoJson>() : {};
    const isMonorepoRoot = isProjectRoot && ((denoJson.workspaces && denoJson.workspaces.length > 0) ||
      (denoJson.workspace && denoJson.workspace.length > 0));

    if (!isMonorepoRoot) {
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
      const exports = denoJson.exports;
      const fsWorkspace = denoJsonFile.parentFolder();
      if (_.isString(exports)) {
        if (await isMainEntryPoint(new FileSpec(fsWorkspace, exports), fsWorkspace)) {
          const name = exports.replace(/^\.\//, '').replace(/\.ts$/, '');
          groups.push({
            id: '.',
            name: name,
            console: DEFAULT_CONSOLE,
            program: exports,
            runtimeArgs: DEFAULT_RUNTIME_ARGS,
            scripts: ['', '--help'],
          });
        }
      } else if (_.isRecordStringString(exports)) {
        for (const [key, filePath] of Object.entries(exports)) {
          if (_.isString(filePath) && await isMainEntryPoint(new FileSpec(fsWorkspace, filePath), fsWorkspace)) {
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

    const launchConfigData: { launch: LaunchConfig; '$schema'?: string } = {
      '$schema': LAUNCH_SCHEMA_URL,
      launch: {
        groups: groups,
      },
    };

    if (isProjectRoot) {
      launchConfigData.launch.port = 9229;
      launchConfigData.launch.console = DEFAULT_CONSOLE;
      launchConfigData.launch.excludes = DEFAULT_EXCLUDES;
      launchConfigData.launch.runtimeExecutable = Deno.execPath();
    }

    const launchConfigFile = new FileSpec(workspaceDir, LAUNCH_CONFIG_FILE);
    await launchConfigFile.writeJson(launchConfigData, null, 2);
  }
}
