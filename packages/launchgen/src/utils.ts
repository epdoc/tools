import { FileSpec, FolderSpec } from '@epdoc/fs';
import { globToRegExp } from '@std/path/glob-to-regexp';
import * as consts from './consts.ts';

/**
 * Finds files in a directory that match a set of include glob patterns and do not match any exclude patterns.
 *
 * @param workspaceDir The directory to search within.
 * @param includes An array of glob patterns to include.
 * @param [excludes=[]] An array of glob patterns to exclude.
 * @returns A promise that resolves to an array of `FileSpec` objects for the matching files.
 */
export async function findFiles(
  workspaceDir: FolderSpec,
  includes: string[],
  excludes: string[] = [],
): Promise<FileSpec[]> {
  // If no includes patterns, return empty array
  if (includes.length === 0) {
    return [];
  }

  const includeRegexes = includes.map((pattern) => globToRegExp(pattern, { globstar: true }));
  const excludeRegexes = excludes.map((pattern) => globToRegExp(pattern, { globstar: true }));

  const files: FileSpec[] = [];
  const walkedFiles = await workspaceDir.walk({
    includeFiles: true,
    includeDirs: false,
    followSymlinks: false,
  });

  for (const spec of walkedFiles) {
    if (spec instanceof FileSpec) {
      const relativePath = spec.path.substring(workspaceDir.path.length + 1);

      // Check if file matches any include pattern
      let included = false;
      for (const regex of includeRegexes) {
        if (regex.test(relativePath)) {
          included = true;
          break;
        }
      }

      if (included) {
        // Check if file matches any exclude pattern
        let excluded = false;
        for (const regex of excludeRegexes) {
          if (regex.test(relativePath)) {
            excluded = true;
            break;
          }
        }
        if (!excluded) {
          files.push(spec);
        }
      }
    }
  }

  return files;
}

/**
 * Searches for a project root directory by looking for a `.vscode` folder.
 * It starts from a given directory and traverses up a specified number of levels.
 *
 * @param fsCwd The starting directory for the search.
 * @param [levels=2] The number of parent directories to search.
 * @returns A `FolderSpec` object representing the root folder if found, otherwise `undefined`.
 */
export async function findRoot(fsCwd: FolderSpec, levels: number = 2): Promise<FolderSpec | undefined> {
  let fsCurrentFolder: FolderSpec = fsCwd;
  for (let i = 0; i < levels; i++) {
    if (fsCurrentFolder) {
      const fsVscodeFolder = new FolderSpec(fsCurrentFolder, consts.VSCODE);
      if (await fsVscodeFolder.isFolder()) {
        return fsCurrentFolder;
      }
      const parentPath = fsCurrentFolder.dirname;
      if (parentPath === fsCurrentFolder.path) {
        return undefined;
      }
      fsCurrentFolder = new FolderSpec(parentPath);
    }
  }
  return undefined;
}

/**
 * Checks if a file is intended to be a runnable entry point.
 *
 * This function uses several heuristics to determine if a file is a main entry
 * point:
 * - It is a `main.ts` file in the root of the workspace.
 * - It's name does not end with 'mod.ts'.
 * - It contains a hashbang (shebang) line (e.g., `#!/usr/bin/env -S deno run`).
 * - It contains the `if (import.meta.main)` pattern.
 *
 * @param fsFile The TypeScript file to check.
 * @param fsWorkspace The workspace's folder, where `deno.json` resides.
 * @returns `true` if the file is likely a main entry point, otherwise `false`.
 */
export async function isMainEntryPoint(fsFile: FileSpec, fsWorkspace: FolderSpec): Promise<boolean> {
  // Check if the file is a main.ts in the root of the workspace
  if (fsFile.parentFolder().equalPaths(fsWorkspace) && fsFile.filename === 'main.ts') {
    console.log(`✅ ${fsFile} is a main entry point (found in workspace folder).`);
    return true;
  }

  if (fsFile.filename.endsWith('mod.ts')) {
    console.log(`❌ ${fsFile} is a module.`);
    return false;
  }

  const fileContent = await fsFile.readAsString();

  // 1. Check for a Hashbang (Shebang)
  // A hashbang must be on the very first line.
  const isHashbangPresent = fileContent.trim().startsWith('#!');
  if (isHashbangPresent) {
    console.log(`✅ ${fsFile} is a main entry point (Found hashbang).`);
    return true;
  }

  // 2. Check for the 'if (import.meta.main)' pattern
  // This uses a regular expression to find the common check structure.
  const mainCheckRegex = /(if|assert)\s*\(\s*import\.meta\.main\s*(,|\))/;
  const isMainCheckPresent = mainCheckRegex.test(fileContent);

  if (isMainCheckPresent) {
    console.log(`✅ ${fsFile} is a main entry point (Found import.meta.main check).`);
    return true;
  }

  console.log(`❌ ${fsFile} is a library module (Neither pattern found).`);
  return false;
}
