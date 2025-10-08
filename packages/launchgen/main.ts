#!/usr/bin/env -S deno run -RWES
import { green, red, white } from '@std/fmt/colors';
import { consts, findRoot, LaunchGenerator } from './src/mod.ts';

/**
 * @fileoverview
 * This script automatically generates or updates the `.vscode/launch.json` file with debugging
 * configurations for Deno or Node.js projects. It detects the project type, finds test and run
 * files, and creates corresponding launch configurations.
 */

async function main() {
  console.log(green('Executing launchgen'));
  const projectRoot = await findRoot(Deno.cwd());
  if (!projectRoot) {
    console.error(red('Project root folder not found'));
    console.log(green('Your project folder must contain a'), consts.VSCODE, green('folder.'));
    console.log(white('Exit'));
    Deno.exit(1);
  }
  console.log(green('Project root:'), projectRoot);

  const generator = new LaunchGenerator(projectRoot);
  await generator.run();
}

if (import.meta.main) {
  main();
}
