import { green, red, white } from '@std/fmt/colors';
import * as Launch from './src/mod.ts';

async function main() {
  console.log(green('Executing launchgen.ts'));
  const projectRoot = await Launch.findRoot(Deno.cwd());
  if (!projectRoot) {
    console.error(red('Project root folder not found'));
    console.log(green('Your project folder must contain a'), Launch.VSCODE, green('folder.'));
    console.log(white('Exit'));
    Deno.exit(1);
  }
  console.log(green('Project root:'), projectRoot);

  const generator = new Launch.LaunchGenerator(projectRoot);
  await generator.run();
}

if (import.meta.main) {
  main();
}
