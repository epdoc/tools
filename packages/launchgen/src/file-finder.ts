import { FileSpec, type FolderSpec } from '@epdoc/fs';
import { globToRegExp } from '@std/path/glob-to-regexp';

export class FileFinder {
  async findFiles(workspaceDir: FolderSpec, includes: string[], excludes: string[] = []): Promise<FileSpec[]> {
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
}
