import type * as CliApp from '@epdoc/cliapp';
import { FileSpec } from '@epdoc/fs';
import * as semver from 'semver';
import type * as Ctx from './context.ts';
import type * as App from './types.ts';

export class AppMain {
  // Main function to run the version bumping logic.
  async run(ctx: Ctx.Context, opts: App.Opts, config?: CliApp.DenoPkg): Promise<string | undefined> {
    const fsDenoFile = new FileSpec(Deno.cwd(), 'deno.json');

    // Check if the file exists.
    const isFile = await fsDenoFile.getIsFile();
    if (!isFile) {
      ctx.log.error.error('File does not exist').relative(fsDenoFile.path).emit();
      return;
    }

    // Read and parse the deno.json file.
    config = config ?? await fsDenoFile.readJson<CliApp.DenoPkg>();
    const currentVersion = config.version;

    if (!currentVersion) {
      ctx.log.error.error('Version does not exist in file').relative(fsDenoFile.path).emit();
      return;
    }

    const IDENTIFIER_ORDER = ['alpha', 'beta', 'rc'];
    let newVersion: string | null = null;
    const parsedVersion = semver.parse(currentVersion);
    if (!parsedVersion) {
      ctx.log.error.error('Invalid version string').value(currentVersion).emit();
      return;
    }

    const { major, minor, patch } = parsedVersion;
    const currentIdentifier = parsedVersion.prerelease[0] as string | undefined;
    const newIdentifier = opts.prereleaseIdentifier;

    if (opts.major) {
      newVersion = semver.inc(currentVersion, 'major');
    } else if (opts.minor) {
      newVersion = semver.inc(currentVersion, 'minor');
    } else if (opts.patch) {
      if (parsedVersion.prerelease.length > 0) {
        newVersion = `${major}.${minor}.${patch + 1}`;
      } else {
        newVersion = semver.inc(currentVersion, 'patch');
      }
    } else if (newIdentifier) {
      if (typeof newIdentifier === 'string') {
        // User provided an identifier, e.g., -i rc
        const currentIndex = currentIdentifier ? IDENTIFIER_ORDER.indexOf(currentIdentifier) : -1;
        const newIndex = IDENTIFIER_ORDER.indexOf(newIdentifier);
        if (newIndex < 0) {
          ctx.log.error.error('Invalid prerelease identifier').value(newIdentifier).emit();
          return;
        }
        if (newIdentifier === currentIdentifier) {
          ctx.log.warn.warn('Identifier is already at').value(newIdentifier).emit();
          return;
        }
        if (newIndex < currentIndex) {
          // New identifier is lower than current one, bump patch
          newVersion = `${major}.${minor}.${patch + 1}-${newIdentifier}.0`;
        } else {
          // New identifier is higher or there was no previous one
          if (currentIdentifier) {
            newVersion = `${major}.${minor}.${patch}-${newIdentifier}.0`;
          } else {
            newVersion = `${major}.${minor}.${patch + 1}-${newIdentifier}.0`;
          }
        }
      } else {
        // User provided -i without an identifier
        if (currentIdentifier) {
          const currentIndex = IDENTIFIER_ORDER.indexOf(currentIdentifier);
          if (currentIndex < IDENTIFIER_ORDER.length - 1) {
            const nextIdentifier = IDENTIFIER_ORDER[currentIndex + 1];
            newVersion = `${major}.${minor}.${patch}-${nextIdentifier}.0`;
          } else {
            // Already at 'rc', so bump patch and start new alpha cycle
            newVersion = `${major}.${minor}.${patch + 1}-alpha.0`;
          }
        } else {
          // No current identifier, start with alpha for next patch
          newVersion = `${major}.${minor}.${patch + 1}-${IDENTIFIER_ORDER[0]}.0`;
        }
      }
    } else {
      // Default behavior
      if (currentIdentifier) {
        newVersion = semver.inc(currentVersion, 'prerelease');
      } else {
        newVersion = semver.inc(currentVersion, 'patch');
      }
    }

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
    return newVersion;
  }
}
