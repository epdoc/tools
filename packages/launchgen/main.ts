import { FolderSpec } from '@epdoc/fs';
import { green, red, white } from '@std/fmt/colors';
import { findRoot, LaunchGenerator } from './src/mod.ts';

async function main() {
  const args = Deno.args;

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: launchgen [options]

Options:
  -h, --help     Show help information
  -v, --version  Show version number
  -n, --dry-run  Show what would be generated without writing files
  --init         Create/recreate launch.config.json with current defaults
`);
    Deno.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('launchgen 1.0.0');
    Deno.exit(0);
  }

  const dryRun = args.includes('--dry-run') || args.includes('-n');
  const init = args.includes('--init');

  const projectRoot = await findRoot(new FolderSpec(Deno.cwd()), 4);
  if (!projectRoot) {
    console.error(red('Project root folder not found'));
    console.log(green('Your project folder must contain a'), '.vscode', green('folder.'));
    console.log(white('Exit'));
    Deno.exit(1);
  }
  console.log(green('Project root:'), projectRoot.path);

  const generator = new LaunchGenerator(projectRoot, dryRun, init);
  await generator.run();
}

if (import.meta.main) {
  main();
}
