import { FileSpec, FolderSpec } from '@epdoc/fs';
import { green, white } from '@std/fmt/colors';
import { globToRegExp } from '@std/path/glob-to-regexp';
import { ConfigLoader } from './config-loader.ts';
import { FileFinder } from './file-finder.ts';
import type { DenoJson, Group, LaunchConfig, LaunchConfiguration, LaunchJson } from './types.ts';

export class LaunchGenerator {
  #projectRoot: FolderSpec;
  #dryRun: boolean;
  #init: boolean;

  constructor(projectRoot: FolderSpec, dryRun = false, init = false) {
    this.#projectRoot = projectRoot;
    this.#dryRun = dryRun;
    this.#init = init;
  }

  async run(): Promise<void> {
    const existingLaunch = await this.#loadExistingLaunch();
    const workspaces = await this.findWorkspaces();
    const configurations: LaunchConfiguration[] = [];

    // Preserve manual configurations
    const manualConfigs = existingLaunch.configurations.filter((config) => !this.#isGenerated(config));
    configurations.push(...manualConfigs);

    console.log(green('Retaining'), white(String(manualConfigs.length)), green('manual configurations'));

    // Process workspaces first
    for (const workspace of workspaces) {
      const rootConfig = await this.processWorkspace(this.#projectRoot, {});
      const workspaceConfig = await this.processWorkspace(workspace, rootConfig);
      const workspaceName = workspace.path.substring(this.#projectRoot.path.length + 1).split('/').pop() || 'unknown';
      const workspaceConfigs = await this.generateConfigurations(workspace, workspaceConfig, workspaceName);
      configurations.push(...workspaceConfigs);
    }

    // Only process root if no workspaces, or for files outside workspace directories
    if (workspaces.length === 0) {
      const rootConfig = await this.processWorkspace(this.#projectRoot, {});
      const rootConfigs = await this.generateConfigurations(this.#projectRoot, rootConfig, 'root');
      configurations.push(...rootConfigs);
    }

    await this.#writeLaunchJson({ ...existingLaunch, configurations });
    if (!this.#dryRun) {
      console.log(green('Updated'), this.#projectRoot.path + '/.vscode/launch.json');
    }
  }

  async #loadExistingLaunch(): Promise<LaunchJson> {
    const launchFile = new FileSpec(this.#projectRoot, '.vscode', 'launch.json');
    if (await launchFile.getIsFile()) {
      return await launchFile.readJson<LaunchJson>();
    }
    return { version: '0.2.0', configurations: [] };
  }

  protected async findWorkspaces(): Promise<FolderSpec[]> {
    const denoJsonFile = new FileSpec(this.#projectRoot, 'deno.json');
    const packageJsonFile = new FileSpec(this.#projectRoot, 'package.json');

    let workspacePatterns: string[] = [];

    if (await denoJsonFile.getIsFile()) {
      const denoJson = await denoJsonFile.readJson<DenoJson>();
      workspacePatterns = denoJson.workspaces || denoJson.workspace || [];
    } else if (await packageJsonFile.getIsFile()) {
      const packageJson = await packageJsonFile.readJson<{ workspaces?: string[] }>();
      workspacePatterns = packageJson.workspaces || [];
    }

    if (workspacePatterns.length === 0) {
      return [];
    }

    const workspaces: FolderSpec[] = [];
    // Normalize patterns by removing leading ./
    const normalizedPatterns = workspacePatterns.map((p) => p.startsWith('./') ? p.slice(2) : p);
    const workspaceRegexes = normalizedPatterns.map((pattern) => globToRegExp(pattern, { globstar: true }));

    const walkedDirs = await this.#projectRoot.walk({
      includeFiles: false,
      includeDirs: true,
      followSymlinks: false,
    });

    for (const spec of walkedDirs) {
      if (spec instanceof FolderSpec && spec.path !== this.#projectRoot.path) {
        const relativePath = spec.path.substring(this.#projectRoot.path.length + 1);

        for (const regex of workspaceRegexes) {
          if (regex.test(relativePath)) {
            const denoJsonInWorkspace = new FileSpec(spec, 'deno.json');
            if (await denoJsonInWorkspace.getIsFile()) {
              workspaces.push(spec);
              break;
            }
          }
        }
      }
    }

    return workspaces;
  }

  protected async processWorkspace(workspace: FolderSpec, parentConfig: LaunchConfig): Promise<LaunchConfig> {
    const configLoader = new ConfigLoader();
    const workspaceConfig = await configLoader.loadAndMerge(workspace, this.#init);
    return this.#mergeConfigs(parentConfig, workspaceConfig);
  }

  #mergeConfigs(parent: LaunchConfig, workspace: LaunchConfig): LaunchConfig {
    const merged: LaunchConfig = { ...parent };

    if (workspace.port !== undefined) merged.port = workspace.port;
    if (workspace.console !== undefined) merged.console = workspace.console;
    if (workspace.excludes !== undefined) merged.excludes = workspace.excludes;

    if (workspace.groups) {
      const parentGroups = parent.groups || [];
      const mergedGroups: Group[] = [...parentGroups];

      for (const workspaceGroup of workspace.groups) {
        const existingIndex = mergedGroups.findIndex((g) => g.id === workspaceGroup.id);
        if (existingIndex >= 0) {
          mergedGroups[existingIndex] = { ...mergedGroups[existingIndex], ...workspaceGroup };
        } else {
          mergedGroups.push(workspaceGroup);
        }
      }
      merged.groups = mergedGroups;
    }

    return merged;
  }

  protected async generateConfigurations(
    workspace: FolderSpec,
    config: LaunchConfig,
    workspaceName: string,
  ): Promise<LaunchConfiguration[]> {
    const configurations: LaunchConfiguration[] = [];

    if (!config.groups) return configurations;

    for (const group of config.groups) {
      if (group.includes) {
        const fileFinder = new FileFinder();
        const allExcludes = [...(config.excludes || []), ...(group.excludes || [])];
        const files = await fileFinder.findFiles(workspace, group.includes, allExcludes);

        for (const file of files) {
          const relativePath = file.path.substring(workspace.path.length + 1);
          const displayName = workspaceName === 'root' ? relativePath : `${workspaceName}: ${relativePath}`;

          console.log(green('  Adding'), displayName);

          configurations.push({
            type: 'node',
            request: 'launch',
            name: displayName,
            program: '${workspaceFolder}/' +
              (workspaceName === 'root' ? relativePath : `${workspaceName}/${relativePath}`),
            cwd: '${workspaceFolder}',
            runtimeExecutable: 'deno',
            runtimeArgs: group.runtimeArgs || [],
            attachSimplePort: group.port || config.port || 9229,
            console: group.console || config.console || 'internalConsole',
            presentation: workspaceName === 'root' ? undefined : {
              group: workspaceName,
            },
            env: { LAUNCHGEN: 'true' },
          });
        }
      } else if (group.program) {
        const scripts = group.scripts || [''];
        console.log(green('  Adding'), white(String(scripts.length)), green('entries for'), group.name);

        for (const script of scripts) {
          const scriptArgs = Array.isArray(script) ? script : (script ? script.split(/\s+/) : []);
          const scriptName = scriptArgs.length > 0 ? ` ${scriptArgs.join(' ')}` : '';
          const displayName = workspaceName === 'root'
            ? `${group.name}${scriptName}`
            : `${workspaceName}: ${group.name}${scriptName}`;

          const args: string[] = [];
          if (group.scriptArgs) {
            if (Array.isArray(group.scriptArgs)) {
              args.push(...group.scriptArgs);
            } else {
              args.push(...group.scriptArgs.split(/\s+/));
            }
          }
          args.push(...scriptArgs);

          configurations.push({
            type: 'node',
            request: 'launch',
            name: displayName,
            program: '${workspaceFolder}/' +
              (workspaceName === 'root' ? group.program : `packages/${workspaceName}/${group.program}`),
            cwd: '${workspaceFolder}',
            runtimeExecutable: 'deno',
            runtimeArgs: group.runtimeArgs || [],
            args,
            attachSimplePort: group.port || config.port || 9229,
            console: group.console || config.console || 'internalConsole',
            presentation: workspaceName === 'root' ? undefined : {
              group: workspaceName,
            },
            env: { LAUNCHGEN: 'true' },
          });
        }
      }
    }

    console.log(green('Generated'), white(String(configurations.length)), green('configurations for'), workspaceName);
    return configurations;
  }

  async #writeLaunchJson(launchJson: LaunchJson): Promise<void> {
    if (this.#dryRun) {
      const tempFile = await Deno.makeTempFile({ suffix: '.json' });
      await Deno.writeTextFile(tempFile, JSON.stringify(launchJson, null, 2));
      console.log(green('Dry run - would update'), this.#projectRoot.path + '/.vscode/launch.json');
      console.log(green('Generated content written to:'), tempFile);
      return;
    }

    const vscodeDirSpec = new FolderSpec(this.#projectRoot, '.vscode');
    await vscodeDirSpec.ensureDir();

    const launchFile = new FileSpec(vscodeDirSpec, 'launch.json');
    await launchFile.writeJson(launchJson);
  }

  #isGenerated(config: LaunchConfiguration): boolean {
    return config.env?.LAUNCHGEN === 'true';
  }
}
