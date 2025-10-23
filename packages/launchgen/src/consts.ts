import os from 'node:os';

export const VSCODE = '.vscode';
export const LAUNCH_CONFIG_FILE = 'launch.config.json';
export const LAUNCH_JSON_FILE = 'launch.json';
export const DENO_JSON_FILE = 'deno.json';
export const PACKAGE_JSON_FILE = 'package.json';
export const LAUNCH_SCHEMA_URL =
  'https://raw.githubusercontent.com/epdoc/tools/master/packages/launchgen/schemas/launch.schema.json';
export const HOME = os.homedir();
export const RUNTIME_EXECUTABLE = `${HOME}/.deno/bin/deno`;
export const DEFAULT_PORT = 9229;
export const DEFAULT_CONSOLE = 'internalConsole';
export const DEFAULT_EXCLUDES = ['node_modules/**', '.git/**', '**/.*', '**/.*/**'];
export const DEFAULT_PROGRAM_ARGS = ['run', '-A', '--inspect-brk'];
export const DEFAULT_RUNTIME_ARGS = ['run', '-A', '--inspect-brk'];
export const DEFAULT_TEST_ARGS = ['test', '-A', '--inspect-brk'];
