# @epdoc/bump Version Bumping Tool

> This tool is part of the [`@epdoc/tools`](../../README.md) repository.

A command-line tool to simplify version bumping for Deno projects. It modifies the `version` field in your `deno.json`
file according to the rules of semantic versioning. Supports monorepos. Can also automatically add a placeholder comment
to CHANGELOG.md.

## Global Installation

You can install `bump` globally on your machine using `deno install`:

```sh
deno install -A -f --name bump https://deno.land/x/epdoc_tools/packages/bump/main.ts
```

Or, if you have the repository cloned locally, you can run the `install` task from the `packages/bump` directory:

```sh
deno task install
```

## Usage

```sh
bump [options]
```

The tool reads the `deno.json` file in the current directory, calculates the new version based on the provided options,
and updates the file. By default, it increments the lowest precedence part of the version. The following flags can be
used to override this behavior.

## Options

| Option                                     | Description                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `--major`                                  | Bumps the major version (e.g., `1.2.3` -> `2.0.0`).                                                                            |
| `--minor`                                  | Bumps the minor version (e.g., `1.2.3` -> `1.3.0`).                                                                            |
| `--patch`                                  | Bumps the patch version (e.g., `1.2.3` -> `1.2.4`).                                                                            |
| `--prerelease`                             | Bumps the prerelease version (e.g., `1.2.3-alpha.0` -> `1.2.3-alpha.1`). This is the default action for pre-release versions.  |
| `-r, --release`                            | Remove prerelease identifier, or bump patch version for stable release.                                                        |
| `-i, --prerelease-identifier [identifier]` | Specifies the prerelease identifier, or bumps prerelease identifier if not specified. Valid options are `alpha`, `beta`, `rc`. |
| `-n, --dry-run`                            | Displays the new version without modifying the `deno.json` file. Useful for previewing changes.                                |
| `-c, --changelog [message]`                | Update CHANGELOG.md with `message` or a placeholder comment.                                                                   |
| `-g, --git`                                | Commit and push changes to git.                                                                                                |
| `--tag`                                    | Create and push a git tag.                                                                                                     |

## Git Integration

The `bump` tool can also help with git operations.

- Use the `-g` flag to automatically commit and push the version change to your git repository.
- Use the `--tag` flag to create a git tag for the new version.

When running in a workspace, if any of the following top-level files have been modified, they will be included in the
commit:

- `deno.lock`
- `deno.json`
- `.gitignore`
- `launch.config.json`
- Any file ending in `.md`
- Any file in the `docs/` directory

### Example

```sh
# current version: 1.2.3
bump --patch -g --tag
# new version: 1.2.4
# git commit -m "Bump version to 1.2.4"
# git tag -a v1.2.4 -m "v1.2.4"
# git push
# git push --tags
```

## Examples

### Default Bumping

If no flags are provided, `bump` intelligently increments the lowest precedence part of the version.

- Increment patch version for a stable release:
  ```sh
  # current version: 0.0.1
  bump
  # new version: 0.0.2
  ```
- Increment prerelease number:
  ```sh
  # current version: 0.0.1-alpha.0
  bump
  # new version: 0.0.1-alpha.1
  ```

### Advancing Prerelease Cycle

Use the `-i` flag without an identifier to move through the prerelease cycle (`alpha` -> `beta` -> `rc`).

- From `alpha` to `beta`:
  ```sh
  # current version: 0.0.1-alpha.5
  bump -i
  # new version: 0.0.1-beta.0
  ```
- From `rc` to a new prerelease cycle for the next patch version:
  ```sh
  # current version: 0.2.1-rc.0
  bump -i
  # new version: 0.2.2-alpha.0
  ```

### Switching Prerelease Identifiers

Use `-i <identifier>` to switch to a specific prerelease identifier.

- Switching to a higher identifier:
  ```sh
  # current version: 0.0.1-alpha.2
  bump -i rc
  # new version: 0.0.1-rc.0
  ```
- Switching to a lower identifier (bumps the patch version):
  ```sh
  # current version: 0.0.1-beta.2
  bump -i alpha
  # new version: 0.0.2-alpha.0
  ```

### Finalizing a Release

Use `--patch` to finalize a prerelease version.

```sh
# current version: 0.0.6-rc.0
bump --patch
# new version: 0.0.7
```

### Bumping Major/Minor with Pre-release

You can combine the `--major` or `--minor` flags with the `-i` flag to bump the version and start a new pre-release
cycle.

- Bump minor and start an `alpha` pre-release:
  ```sh
  # current version: 1.2.3
  bump --minor -i alpha
  # new version: 1.3.0-alpha.0
  ```

- Bump major on a pre-release version and start a new `beta` pre-release:
  ```sh
  # current version: 2.0.5-alpha.2
  bump --major -i beta
  # new version: 3.0.0-beta.0
  ```
