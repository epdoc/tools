import type * as CliApp from '@epdoc/cliapp';

export type Opts =
  & CliApp.Opts
  & Partial<{
    major: boolean;
    minor: boolean;
    patch: boolean;
    prerelease: boolean;
    release: boolean;
    prereleaseIdentifier: string | boolean;
    dryRun: boolean;
    changelog: boolean | string;
  }>;
