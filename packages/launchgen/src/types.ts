/**
 * Represents a single VS Code launch configuration.
 * See: https://code.visualstudio.com/docs/editor/debugging#_launch-configurations
 */
export type LaunchConfiguration = {
  /**
   * The type of debugger to use for this launch configuration.
   * @example 'node'
   */
  type: string;
  /**
   * The request type of the debug configuration.
   */
  request: 'launch';
  /**
   * The name of the launch configuration as it appears in the Debug launch dropdown.
   */
  name: string;
  /**
   * The program to launch.
   */
  program?: string;
  /**
   * The working directory of the program.
   * @example '${workspaceFolder}'
   */
  cwd?: string;
  /**
   * The runtime executable to use.
   */
  runtimeExecutable?: string;
  /**
   * The arguments to pass to the runtime executable.
   */
  runtimeArgs?: string[];
  /**
   * The arguments to pass to the program.
   */
  args?: string[];
  /**
   * The port to attach the debugger to.
   */
  attachSimplePort?: number;
  /**
   * The console to use for the debug session.
   */
  console?: string;
  /**
   * The presentation options for the debug session.
   */
  presentation?: {
    /**
     * The group to which this configuration belongs.
     */
    group?: string;
  };
  /**
   * The environment variables to pass to the program.
   */
  env?: { [key: string]: string };
};

/**
 * Represents the structure of a `.vscode/launch.json` file.
 */
export type LaunchJson = {
  /**
   * The version of the launch.json format.
   */
  version: string;
  /**
   * The list of launch configurations.
   */
  configurations: LaunchConfiguration[];
  /**
   * The list of compound launch configurations.
   */
  compounds?: unknown[];
  /**
   * The default debug port.
   */
  port?: number;
  /**
   * The default console type.
   */
  console?: string;
};

/**
 * Defines a group of related launch configurations.
 */
export type Group = {
  /**
   * A unique identifier for the group, used for merging configurations.
   */
  id: string;
  /**
   * The display name for the group, used as a base for launch configuration names.
   */
  name: string;
  /**
   * An array of glob patterns to include files for this group.
   * Mutually exclusive with `program`.
   */
  includes?: string[];
  /**
   * An array of glob patterns to exclude files from this group.
   */
  excludes?: string[];
  /**
   * The path to a single executable file.
   * Mutually exclusive with `includes`.
   */
  program?: string;
  /**
   * The runtime executable to use for this group. Overrides the root `runtimeExecutable`.
   */
  runtimeExecutable?: string;
  /**
   * An array of arguments to pass to the Deno runtime.
   */
  runtimeArgs?: string[];
  /**
   * Default arguments to pass to the script.
   */
  scriptArgs?: string | string[];
  /**
   * An array of script variations. Each entry creates a separate launch configuration.
   * An entry can be a string of arguments or an array of arguments.
   */
  scripts?: (string | string[])[];
  /**
   * The debug port for this group. Overrides the root `port`.
   */
  port?: number;
  /**
   * The console type for this group. Overrides the root `console`.
   */
  console?: string;
};

/**
 * Defines the structure of the `launch` property in `deno.json` or the content of `launch.config.json`.
 */
export type LaunchConfig = {
  /**
   * The URL of the JSON schema for this file.
   */
  '$schema'?: string;
  /**
   * The default debug port for all launch configurations.
   * @default 9229
   */
  port?: number;
  /**
   * The default console type to use.
   * @default 'internalConsole'
   */
  console?: string;
  /**
   * The default Deno runtime executable to use.
   */
  runtimeExecutable?: string;
  /**
   * An array of glob patterns to exclude from all groups.
   */
  excludes?: string[];
  /**
   * An array of configuration groups.
   */
  groups?: Group[];
};

/**
 * Represents the structure of a `deno.json` file.
 */
export type DenoJson = {
  /**
   * An array of workspace glob patterns.
   */
  workspaces?: string[];
  /**
   * An array of workspace glob patterns.
   */
  workspace?: string[];
  /**
   * A map of executable exports.
   */
  exports?: Record<string, string>;
  /**
   * The launch configuration.
   */
  launch?: LaunchConfig;
};

/**
 * Represents the structure of a `package.json` file.
 */
export type PackageJson = {
  /**
   * An array of workspace glob patterns.
   */
  workspaces?: string[];
};
