import { gray, green, white } from '@std/fmt/colors';
import { walk } from '@std/fs/walk';
import { dirname, globToRegExp, relative, resolve } from '@std/path';
import consts from './consts.ts';
import type {
  DenoJson,
  LaunchConfig,
  LaunchConfigGroup,
  LaunchSpec,
  LaunchSpecConfig,
  PackageJson,
  RuntimeType,
} from './types.ts';

/**
 * Generates `launch.json` configurations for Deno or Node.js projects.
 */
export class LaunchGenerator {
  #projectRoot: string;
  #runtime: RuntimeType = 'deno';
  #launchSpec: LaunchSpec = consts.DEFAULT;
  #launchConfig: LaunchConfig = {
    port: 9229,
    console: 'internalConsole',
    tests: {
      runtimeArgs: ['--check'],
    },
  };
  #projectConfig: DenoJson | PackageJson = {};

  constructor(projectRoot: string) {
    this.#projectRoot = projectRoot;
  }

  async run(): Promise<void> {
    await this.detectRuntime();
    await this.loadConfigs();
    this.filterExisting();
    await this.addWorkspaceFiles();
    this.addCustomGroups();
    await this.writeLaunchJson();
  }

  protected async detectRuntime(): Promise<void> {
    try {
      const denoJsonPath = resolve(this.#projectRoot, 'deno.json');
      const denoJsonStats = await Deno.stat(denoJsonPath);
      if (denoJsonStats.isFile) {
        this.#runtime = 'deno';
        return;
      }
    } catch (_err) {
      // continue
    }
    try {
      const packageJsonPath = resolve(this.#projectRoot, 'package.json');
      const packageJsonStats = await Deno.stat(packageJsonPath);
      if (packageJsonStats.isFile) {
        this.#runtime = 'node';
        return;
      }
    } catch (_err) {
      // Default to deno
    }
  }

  protected async loadConfigs(): Promise<void> {
    const launchFile = resolve(this.#projectRoot, consts.VSCODE, 'launch.json');
    const configFile = resolve(this.#projectRoot, consts.CONFIG);
    const projFile = resolve(
      this.#projectRoot,
      this.#runtime === 'deno' ? 'deno.json' : 'package.json',
    );

    try {
      this.#launchSpec = JSON.parse(await Deno.readTextFile(launchFile));
    } catch (_err) {
      /* use default */
    }
    try {
      const launchConfig = JSON.parse(await Deno.readTextFile(configFile));
      this.#launchConfig = { ...this.#launchConfig, ...launchConfig };
    } catch (_err) {
      /* use default */
    }
    try {
      this.#projectConfig = JSON.parse(await Deno.readTextFile(projFile));
    } catch (_err) {
      /* use default */
    }
  }

  protected filterExisting(): void {
    this.#launchSpec.configurations = this.#launchSpec.configurations.filter(
      (config) => !this.isGenerated(config),
    );
    console.log(
      green('Retaining'),
      white(String(this.#launchSpec.configurations.length)),
      green('configurations from existing launch.json'),
    );
    this.#launchSpec.configurations.forEach((config) => {
      console.log(green('  Retaining'), config.name);
    });
  }

  protected async addWorkspaceFiles(): Promise<void> {
    const additions: string[] = [];
    const tests = (this.#projectConfig as DenoJson).tests;
    let workspaces = (this.#projectConfig as DenoJson).workspace ||
      (this.#projectConfig as PackageJson).workspaces || ['./'];
    const include = tests?.include || ['**/*'];
    const exclude = tests?.exclude || [];
    exclude.push('**/.*');
    console.log({ workspaces, include, exclude });
    const includeRegex = include.map((pattern) => {
      return globToRegExp(resolve(this.#projectRoot, pattern), { globstar: true });
    });
    const excludeRegex = exclude.map((pattern) => {
      return globToRegExp(resolve(this.#projectRoot, pattern), { globstar: true });
    });

    let workspaceRoot: string | undefined;
    if (workspaces.length === 1 && workspaces[0].endsWith('/*')) {
      workspaceRoot = dirname(workspaces[0]);
      if (workspaceRoot === '.') {
        workspaceRoot = undefined;
      } else {
        workspaceRoot = workspaceRoot.replace(/^\.\//, '') + '/';
      }
    }

    if (Array.isArray(workspaces)) {
      const expandedWorkspaces: string[] = [];
      for (const scope of workspaces) {
        if (scope.includes('*')) {
          for await (
            const entry of walk(this.#projectRoot, {
              match: [globToRegExp(scope, { globstar: true })],
              maxDepth: 1,
              includeDirs: false,
              includeFiles: false,
            })
          ) {
            if (entry.isDirectory) {
              try {
                const denoJsonPath = resolve(entry.path, 'deno.json');
                const denoJsonStats = await Deno.stat(denoJsonPath);
                if (denoJsonStats.isFile) {
                  expandedWorkspaces.push(entry.path);
                }
              } catch (_err) {
                // Not a workspace, ignore.
              }
            }
          }
        } else {
          expandedWorkspaces.push(resolve(this.#projectRoot, scope));
        }
      }
      workspaces = expandedWorkspaces;

      await Promise.all(
        workspaces.map(async (workspacePath: string) => {
          for await (
            const entry of walk(workspacePath, {
              match: includeRegex,
              skip: excludeRegex,
            })
          ) {
            console.log('entry', entry.path);
            if (entry.isFile && /\.(test|run)\.(ts|js)$/.test(entry.name)) {
              let relativePath = relative(this.#projectRoot, entry.path);
              if (workspaceRoot && relativePath.startsWith(workspaceRoot)) {
                relativePath = relativePath.substring(workspaceRoot.length);
              }
              additions.push(entry.path);
            }
          }
        }),
      );
    }

    console.log(green('Adding'), white(String(additions.length)), green('test files'));
    additions.sort((a, b) => a.localeCompare(b));
    additions.forEach((entry) => {
      this.addTest(entry);
    });
  }

  protected addCustomGroups(): void {
    const configAdditions: LaunchSpecConfig[] = [];
    if (Array.isArray(this.#launchConfig.groups)) {
      this.#launchConfig.groups.forEach((group: LaunchConfigGroup) => {
        if (!group.scripts || group.scripts.length === 0) {
          group.scripts = [''];
        }
        group.scripts.forEach((script: string | string[]) => {
          const name = Array.isArray(script) ? script.join(' ') : script;
          const entry: LaunchSpecConfig = {
            type: 'node',
            request: 'launch',
            name: `Debug ${group.program} ${name}`,
            program: '${workspaceFolder}/' + group.program,
            cwd: '${workspaceFolder}',
            runtimeExecutable: this.#runtime,
            runtimeArgs: group.runtimeArgs,
            attachSimplePort: this.#launchConfig.port || 9229,
            console: this.#launchConfig.console || 'internalConsole',
            env: { LAUNCHGEN: 'true' },
          };
          const argLog = Array.isArray(group.scriptArgs) ? group.scriptArgs : [];
          if (Array.isArray(script)) {
            entry.args = [...argLog, ...script];
          } else {
            entry.args = [...argLog, ...script.split(/\s+/)];
          }
          configAdditions.push(entry);
        });
      });
    }

    console.log(green('Adding'), white(String(configAdditions.length)), green(`from ${consts.CONFIG}`));
    configAdditions.forEach((entry: LaunchSpecConfig) => {
      console.log(green('  Adding'), entry.name);
      this.#launchSpec.configurations.push(entry);
    });
  }

  protected async writeLaunchJson(): Promise<void> {
    const launchFilePath = resolve(this.#projectRoot, consts.VSCODE, 'launch.json');
    await Deno.writeTextFile(launchFilePath, JSON.stringify(this.#launchSpec, null, 2));
    console.log(green('Updated'), launchFilePath);
  }

  protected addTest(entry: string): void {
    const relativePath = relative(this.#projectRoot, entry);
    console.log(green('  Adding'), relativePath, gray(entry));
    const defaultArgs = this.#runtime === 'deno' ? ['test', '--inspect-brk', '-A'] : [];
    const runtimeArgs = [...defaultArgs, entry];
    const testRuntimeArgs = this.#launchConfig.tests?.runtimeArgs || ['--check'];
    if (testRuntimeArgs) {
      testRuntimeArgs.forEach((arg) => {
        if (defaultArgs.includes(arg)) {
          console.log(gray(`  Info: runtimeArg "${arg}" is already in the default list`));
        }
      });
      runtimeArgs.push(...testRuntimeArgs);
    }
    const item: LaunchSpecConfig = {
      type: this.#runtime,
      request: 'launch',
      name: `Debug ${relativePath}`,
      program: '${workspaceFolder}/' + relativePath,
      cwd: '${workspaceFolder}',
      runtimeExecutable: this.#runtime,
      runtimeArgs,
      attachSimplePort: this.#launchConfig.port || 9229,
      console: this.#launchConfig.console || 'internalConsole',
      env: { LAUNCHGEN: 'true' },
    };
    this.#launchSpec.configurations.push(item);
  }

  protected isGenerated(config: LaunchSpecConfig): boolean {
    return config.env?.LAUNCHGEN === 'true';
  }
}
