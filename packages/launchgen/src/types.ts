export type RuntimeType = 'deno' | 'node';

export type ConfigGeneric = Record<string, number | string | string[] | Record<string, string>> & {
  env?: { [key: string]: string };
};

export type LaunchSpecConfig = ConfigGeneric & {
  type: string;
  request: 'launch';
  name?: string;
  cwd?: string;
  runtimeExecutable?: string;
  runtimeArgs?: string[];
  attachSimplePort: number;
  console?: string;
  env?: { [key: string]: string };
};

export type LaunchSpec = {
  version: string;
  configurations: LaunchSpecConfig[];
};

export type DenoJson = {
  workspace?: string[];
  tests?: {
    include?: string[];
    exclude?: string[];
  };
};

export type PackageJson = {
  workspaces?: string[];
};

export type LaunchConfig = {
  port?: number;
  console?: string;
  tests?: {
    runtimeArgs?: string[];
  };
  groups?: LaunchConfigGroup[];
};

export type LaunchConfigGroup = {
  program: string;
  runtimeArgs: string[];
  scriptArgs?: string;
  scripts: (string | string[])[];
};
