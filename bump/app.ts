import type * as CliApp from '@epdoc/cliapp';
import { FileSpec } from '@epdoc/fs';
import * as semver from 'semver';
import type * as Ctx from './context.ts';
import type * as App from './types.ts';

export class AppMain {
  // Main function to run the version bumping logic.
  async run(ctx: Ctx.Context, opts: App.Opts) {
    const fsDenoFile = new FileSpec(Deno.cwd(), 'deno.json');

    // Check if the file exists.
    const isFile = await fsDenoFile.getIsFile();
    if (!isFile) {
      ctx.log.error.error('File does not exist').relative(fsDenoFile.path).emit();
      return;
    }

    // Read and parse the deno.json file.
    const config = await fsDenoFile.readJson<CliApp.DenoPkg>();
    const currentVersion = config.version;

    if (!currentVersion) {
      ctx.log.error.error('Version does not exist in file').relative(fsDenoFile.path).emit();
      return;
    }

    let newVersion: string | null = null;
    const identifier = opts.prereleaseIdentifier as semver.ReleaseType;
    let bumpType: semver.ReleaseType = 'patch';

    // Determine the bump type. The order of checks is important here.
    if (opts.major) {
      bumpType = 'major';
    } else if (opts.minor) {
      bumpType = 'minor';
    } else if (opts.prerelease) {
      bumpType = 'prerelease';
    }

    // Check if the prerelease identifier is valid.
    if (
      bumpType === 'prerelease' && identifier &&
      !['alpha', 'beta', 'rc'].includes(identifier)
    ) {
      ctx.log.error.error('Invalid prerelease identifier').value(identifier).text('Must be "alpha", "beta", or "rc".')
        .emit();
      return;
    }

    // Use semver.inc to get the new version.
    newVersion = semver.inc(currentVersion, bumpType, identifier);

    // Handle the case where the new version could not be calculated.
    if (!newVersion) {
      ctx.log.error.error('Failed to bump version. Please check the current version format').value(currentVersion)
        .emit();
      return;
    }

    // Display the versions.
    ctx.log.info.h1('Current version:').value(currentVersion).emit();
    ctx.log.info.h1('New version:').value(newVersion).emit();

    // Update the file unless it's a dry run.
    if (!opts.dryRun) {
      config.version = newVersion;
      fsDenoFile.writeJson(config);
      ctx.log.info.h1('Updated').relative(fsDenoFile.path).h1('with new version').emit();
    } else {
      ctx.log.info.h1('Dry run complete. No changes were made to the file.').emit();
    }
  }
}
