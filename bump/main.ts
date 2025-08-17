import * as CliApp from '@epdoc/cliapp';
import { AppMain } from './app.ts';
import * as Ctx from './context.ts';
import pkg from './deno.json' with { type: 'json' };
import type * as App from './types.ts';

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

  addOptions() {
    this.cmd.option('--major', 'Bumps the major version.', false)
      .option('--minor', 'Bumps the minor version.', false)
      .option('--patch', 'Bumps the patch version. (default)', false)
      .option('--prerelease', 'Bumps the prerelease version.', false)
      .option(
        '-i, --prerelease-identifier [identifier]',
        "Specifies the prerelease identifier (e.g., 'alpha', 'beta', 'rc')."
      )
      .option(
        '-n, --dry-run',
        'Displays the new version without writing to the file.',
        false,
      );
  }
}

const ctx = new Ctx.Context();
const main = new Main(pkg);
main.init();

// Use CliApp utility run method that adds logging and error handling
CliApp.run(ctx, () => main.run(ctx));
