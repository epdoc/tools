import * as CliApp from '@epdoc/cliapp';
import { AppMain } from './app.ts';
import * as Ctx from './context.ts';
import pkg from './deno.json' with { type: 'json' };
import type * as App from './types.ts';

class Option extends CliApp.Commander.Option {}

class Main {
  cmd: CliApp.Command;

  constructor(pkg: CliApp.DenoPkg) {
    this.cmd = new CliApp.Command(pkg).init(ctx);
  }

  init() {
    this.addOptions();
    this.cmd.addLogging(ctx);
  }

  async run(ctx: Ctx.Context): Promise<void> {
    const opts = await this.cmd.parseOpts() as App.Opts;
    CliApp.configureLogging(ctx, opts);
    const app = new AppMain();
    await app.run(ctx, opts);
  }

  addOptions(): this {
    const options: Option[] = [
      new Option('--major', 'Bumps the major version.').default(false),
      new Option('--minor', 'Bumps the minor version.').default(false),
      new Option('--patch', 'Bumps the patch version. (default)').default(false),
      new Option('--prerelease', 'Bumps the prerelease version.').default(false),
      new Option('-r, --release', 'Remove prerelease identifier, or bump patch version for stable release.').default(
        false,
      ),
      new Option(
        '-i, --prerelease-identifier [identifier]',
        'Specifies the prerelease identifier, or bumps prerelease identifier if not specified',
      ).choices(['alpha', 'beta', 'rc']),
      new Option(
        '-n, --dry-run',
        'Displays the new version without writing to the file.',
      ).default(false),
      new Option('-c --changelog', 'Update CHANGELOG.md').default(false),
    ];
    options.forEach((option) => {
      this.cmd.addOption(option);
    });
    return this;
  }
}

const ctx = new Ctx.Context();
const main = new Main(pkg);
main.init();

// Use CliApp utility run method that adds logging and error handling
CliApp.run(ctx, () => main.run(ctx));
