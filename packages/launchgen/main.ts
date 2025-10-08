import { FolderSpec } from '@epdoc/fs';
import { green, red, white } from '@std/fmt/colors';
import * as Launch from './src/mod.ts';

async function main() {
  const args = Deno.args;

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: launchgen [options]

Options:
  -h, --help     Show help information
  -v, --version  Show version number
`);
    Deno.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    // TODO: Get version from a more appropriate source, e.g., deno.json
    console.log('launchgen 1.0.0');
    Deno.exit(0);
  }

  const projectRoot = await Launch.findRoot(new FolderSpec(Deno.cwd()), 4);
  if (!projectRoot) {
    console.error(red('Project root folder not found'));
    console.log(green('Your project folder must contain a'), Launch.VSCODE, green('folder.'));
    console.log(white('Exit'));
    Deno.exit(1);
  }
  console.log(green('Project root:'), projectRoot.path);

  const generator = new Launch.LaunchGenerator(projectRoot);
  await generator.run();
}

if (import.meta.main) {
  main();
}
