#!/usr/bin/env -S deno run -RWES
import { gray, green, red, white } from '@std/fmt/colors';
import * as dfs from '@std/fs';
import { globToRegExp } from '@std/path/glob-to-regexp';
import path from 'node:path';

/**
 * @fileoverview
 * This script automatically generates or updates the `.vscode/launch.json` file with debugging
 * configurations for Deno or Node.js projects. It detects the project type, finds test and run
 * files, and creates corresponding launch configurations.
 */

// --- Constants ---------------------------------------------------------------

const VSCODE = '.vscode';
const LAUNCH_DEFAULT: LaunchSpec = { version: '0.2.0', configurations: [] };
const LAUNCH_CONFIG = 'launch.config.json';

// --- Type Declarations -------------------------------------------------------

type RuntimeType = 'deno' | 'node';

type ConfigGeneric = Record<string, number | string | string[] | Record<string, string>> & {
  env?: { [key: string]: string };
};

type LaunchSpecConfig = ConfigGeneric & {
  type: string;
  request: 'launch';
  name?: string;
  cwd?: string;
  runtimeExecutable?: string;
  runtimeArgs?: string[];
  attachSimplePort: number;
  console?: string;
};

type LaunchSpec = {
  version: string;
  configurations: LaunchSpecConfig[];
};

type DenoJson = {
  workspace?: string[];
  tests?: {
    include?: string[];
    exclude?: string[];
  };
};

type PackageJson = {
  workspaces?: string[];
};

type LaunchConfig = {
  port?: number;
  console?: string;
  tests?: {
    runtimeArgs?: string[];
  };
  groups?: LaunchConfigGroup[];
};

type LaunchConfigGroup = {
  program: string;
  runtimeArgs: string[];
  scriptArgs?: string;
  scripts: (string | string[])[];
};

// --- Class -------------------------------------------------------------------

/**
 * Generates `launch.json` configurations for Deno or Node.js projects.
 */
export class LaunchGenerator {
  #projectRoot: string;
  #runtime: RuntimeType = 'deno';
  #launchSpec: LaunchSpec = LAUNCH_DEFAULT;
  #launchConfig: LaunchConfig = {};
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
    this.writeLaunchJson();
  }

  protected async detectRuntime(): Promise<void> {
    try {
      await Deno.stat(path.join(this.#projectRoot, 'deno.json'));
      this.#runtime = 'deno';
    } catch (_err) {
      try {
        await Deno.stat(path.join(this.#projectRoot, 'package.json'));
        this.#runtime = 'node';
      } catch (_err) {
        // Default to deno
      }
    }
  }

  protected async loadConfigs(): Promise<void> {
    const launchFile = path.resolve(this.#projectRoot, VSCODE, 'launch.json');
    const configFile = path.resolve(this.#projectRoot, LAUNCH_CONFIG);
    const projFile = path.resolve(
      this.#projectRoot,
      this.#runtime === 'deno' ? 'deno.json' : 'package.json',
    );

    try {
      this.#launchSpec = JSON.parse(await Deno.readTextFile(launchFile));
    } catch (_err) {
      /* use default */
    }
    try {
      this.#launchConfig = JSON.parse(await Deno.readTextFile(configFile));
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
    const additions: dfs.WalkEntry[] = [];
    const tests = (this.#projectConfig as DenoJson).tests;
    let workspaces = (this.#projectConfig as DenoJson).workspace ||
      (this.#projectConfig as PackageJson).workspaces || ['./'];
    const include = tests?.include || ['**/*'];
    const exclude = tests?.exclude || [];
    exclude.push('**/.*');
    console.log({workspaces, include, exclude});
    const includeRegex = include.map((pattern) => {
      return globToRegExp(path.resolve(this.#projectRoot, pattern), { globstar: true });
    });
    const excludeRegex = exclude.map((pattern) => {
      return globToRegExp(path.resolve(this.#projectRoot, pattern), { globstar: true });
    });

    let workspaceRoot: string | undefined;
    if (workspaces.length === 1 && workspaces[0].endsWith('/*')) {
      workspaceRoot = path.dirname(workspaces[0]);
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
          for await (const entry of dfs.expandGlob(scope, { root: this.#projectRoot })) {
            if (entry.isDirectory) {
              try {
                await Deno.stat(path.join(entry.path, 'deno.json'));
                expandedWorkspaces.push(entry.path);
              } catch (_err) {
                // Not a workspace, ignore.
              }
            }
          }
        } else {
          expandedWorkspaces.push(path.resolve(this.#projectRoot, scope));
        }
      }
      workspaces = expandedWorkspaces;

      await Promise.all(
        workspaces.map(async (workspacePath: string) => {
          for await (
            const entry of dfs.walk(workspacePath, {
              match: includeRegex,
              skip: excludeRegex,
            })
          ) {
            console.log('entry', entry.path);
            if (entry.isFile && /\.(test|run)\.(ts|js)$/.test(entry.name)) {
              let relativePath = path.relative(this.#projectRoot, entry.path);
              if (workspaceRoot && relativePath.startsWith(workspaceRoot)) {
                relativePath = relativePath.substring(workspaceRoot.length);
              }
              entry.name = relativePath;
              additions.push(entry);
            }
          }
        }),
      );
    }

    console.log(green('Adding'), white(String(additions.length)), green('test files'));
    additions.sort((a, b) => a.path.localeCompare(b.path));
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

    console.log(green('Adding'), white(String(configAdditions.length)), green(`from ${LAUNCH_CONFIG}`));
    configAdditions.forEach((entry: LaunchSpecConfig) => {
      console.log(green('  Adding'), entry.name);
      this.#launchSpec.configurations.push(entry);
    });
  }

  protected writeLaunchJson(): void {
    const launchFile = path.resolve(this.#projectRoot, VSCODE, 'launch.json');
    Deno.writeTextFileSync(launchFile, JSON.stringify(this.#launchSpec, null, 2));
    console.log(green('Updated'), launchFile);
  }

  protected addTest(entry: dfs.WalkEntry): void {
    if (entry.isFile) {
      console.log(green('  Adding'), entry.name, gray(entry.path));
      const defaultArgs = this.#runtime === 'deno' ? ['test', '--inspect-brk', '-A'] : [];
      const runtimeArgs = [...defaultArgs, entry.path];
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
        name: `Debug ${entry.name}`,
        program: '${workspaceFolder}/' + entry.name,
        cwd: '${workspaceFolder}',
        runtimeExecutable: this.#runtime,
        runtimeArgs,
        attachSimplePort: this.#launchConfig.port || 9229,
        console: this.#launchConfig.console || 'internalConsole',
        env: { LAUNCHGEN: 'true' },
      };
      this.#launchSpec.configurations.push(item);
    }
  }

  protected isGenerated(config: LaunchSpecConfig): boolean {
    return config.env?.LAUNCHGEN === 'true';
  }
}

// --- Helper Functions --------------------------------------------------------

async function findRoot(cwd: string, levels: number = 2): Promise<string | undefined> {
  for (let i = 0; i < levels; i++) {
    const checkPath = path.resolve(cwd, ...Array(i).fill('..'));
    try {
      const fileInfo = await Deno.lstat(path.join(checkPath, VSCODE));
      if (fileInfo.isDirectory) {
        return checkPath;
      }
    } catch (_err) {
      // continue
    }
  }
  return undefined;
}

// --- Main Execution ----------------------------------------------------------

async function main() {
  console.log(green('Executing launchgen.ts'));
  const projectRoot = await findRoot(Deno.cwd());
  if (!projectRoot) {
    console.error(red('Project root folder not found'));
    console.log(green('Your project folder must contain a'), VSCODE, green('folder.'));
    console.log(white('Exit'));
    Deno.exit(1);
  }
  console.log(green('Project root:'), projectRoot);

  const generator = new LaunchGenerator(projectRoot);
  await generator.run();
}

if (import.meta.main) {
  main();
}
