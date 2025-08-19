import type * as CliApp from '@epdoc/cliapp';
import { FileSpec } from '@epdoc/fs';
import { assert } from '@std/assert';
import * as semver from 'semver';
import { Changelog } from './changelog.ts';
import type * as Ctx from './context.ts';
import { Git } from './git.ts';
import type * as App from './types.ts';

export class AppMain {
  // Main function to run the version bumping logic.
  async run(
    ctx: Ctx.Context,
    opts: App.Opts,
  ): Promise<void> {
    const fsDenoFile = new FileSpec(Deno.cwd(), 'deno.json');
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

    const newVersion = AppMain.increment(ctx, currentVersion, opts);

    if (newVersion) { // Update the file unless it's a dry run.
      if (!opts.dryRun) {
        config.version = newVersion;
        fsDenoFile.writeJson(config);
        let message: string | undefined;
        if (opts.changelog) {
          const changelog = new Changelog();
          message = typeof opts.changelog === 'string' ? opts.changelog : undefined;
          await changelog.update(newVersion, message);
        }
        ctx.log.info.h1('Updated').relative(fsDenoFile.path).h1('with new version').emit();
        await this.#gitOps(ctx, opts, newVersion, message);
      } else {
        ctx.log.info.h1('Dry run complete. No changes were made to the file.').emit();
      }
    }
  }

  async #gitOps(ctx: Ctx.Context, opts: App.Opts, version: string, message?: string) {
    if (opts.git || opts.tag) {
      const git = new Git(ctx);
      await git.add();
      const msg = message ? message : `Bump version to ${version}`;
      await git.commit(msg);
      if (opts.tag) {
        await git.tag(version, msg);
      }
      await git.push(opts.tag || false);
    }
  }

  static increment(
    ctx: Ctx.Context,
    version: string,
    opts: App.Opts = {},
  ): string | undefined {
    assert(version, 'version is required');

    const IDENTIFIER_ORDER = ['alpha', 'beta', 'rc'];
    let newVersion: string | null = null;
    const parsedVersion = semver.parse(version);
    if (!parsedVersion) {
      ctx.log.error.error('Invalid version string').value(version).emit();
      return;
    }

    const { major, minor, patch } = parsedVersion;
    const currentIdentifier = parsedVersion.prerelease[0] as string | undefined;
    const newIdentifier = opts.prereleaseIdentifier;

    if (opts.release) {
      if (parsedVersion.prerelease.length > 0) {
        newVersion = `${major}.${minor}.${patch}`;
      } else {
        ctx.log.info.warn('Version is already stable. Bumping patch level.').emit();
        newVersion = semver.inc(version, 'patch');
      }
    } else if (opts.major) {
      const newIdentifier = opts.prereleaseIdentifier;
      if (newIdentifier) {
        const identifier = typeof newIdentifier === 'string' ? newIdentifier : 'alpha';
        newVersion = semver.inc(version, 'premajor', identifier);
      } else {
        newVersion = semver.inc(version, 'major');
      }
    } else if (opts.minor) {
      const newIdentifier = opts.prereleaseIdentifier;
      if (newIdentifier) {
        const identifier = typeof newIdentifier === 'string' ? newIdentifier : 'alpha';
        newVersion = semver.inc(version, 'preminor', identifier);
      } else {
        newVersion = semver.inc(version, 'minor');
      }
    } else if (opts.patch) {
      newVersion = semver.inc(version, 'patch');
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
          ctx.log.warn.warn('Identifier is already at').value(newIdentifier).warn('- Bumping prerelease version')
            .emit();
          newVersion = semver.inc(version, 'prerelease');
        } else if (newIndex < currentIndex) {
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
            // Already at 'rc', so finalize the release
            newVersion = `${major}.${minor}.${patch}`;
          }
        } else {
          // No current identifier, start with alpha for next patch
          newVersion = `${major}.${minor}.${patch + 1}-${IDENTIFIER_ORDER[0]}.0`;
        }
      }
    } else {
      // Default behavior
      if (currentIdentifier) {
        newVersion = semver.inc(version, 'prerelease');
      } else {
        newVersion = semver.inc(version, 'patch');
      }
    }

    // Handle the case where the new version could not be calculated.
    if (!newVersion) {
      ctx.log.error.error('Failed to bump version. Please check the current version format').value(version).emit();
      return;
    }

    // Display the versions.
    ctx.log.info.h1('Current version:').value(version).emit();
    ctx.log.info.h1('New version:').value(newVersion).emit();

    return newVersion;
  }
}
