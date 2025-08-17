import type * as CliApp from '@epdoc/cliapp';

export type Opts = CliApp.Opts & {
  major: boolean;
  minor: boolean;
  patch: boolean;
  prerelease: boolean;
  prereleaseIdentifier: string | boolean;
  dryRun: boolean;
};
