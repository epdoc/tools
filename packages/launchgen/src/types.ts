export type LaunchConfiguration = {
  type: string;
  request: 'launch';
  name: string;
  program?: string;
  cwd?: string;
  runtimeExecutable?: string;
  runtimeArgs?: string[];
  args?: string[];
  attachSimplePort?: number;
  console?: string;
  presentation?: {
    group?: string;
  };
  env?: { [key: string]: string };
};

export type LaunchJson = {
  version: string;
  configurations: LaunchConfiguration[];
  compounds?: unknown[];
  attachSimplePort?: number;
  console?: string;
};

export type Group = {
  id: string;
  name: string;
  includes?: string[];
  excludes?: string[];
  program?: string;
  runtimeArgs?: string[];
  scriptArgs?: string | string[];
  scripts?: (string | string[])[];
  port?: number;
  console?: string;
};

export type LaunchConfig = {
  port?: number;
  console?: string;
  excludes?: string[];
  groups?: Group[];
};

export type DenoJson = {
  workspaces?: string[];
  workspace?: string[];
  exports?: Record<string, string>;
  launch?: LaunchConfig;
};

export type PackageJson = {
  workspaces?: string[];
};
