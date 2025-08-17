# `bump` Version Bumping Tool

A command-line tool to simplify version bumping for Deno projects. It modifies the `version` field in your `deno.json` file according to the rules of semantic versioning, with additional support for complex prerelease workflows.

## Usage

```sh
bump [options]
```

The tool reads the `deno.json` file in the current directory, calculates the new version based on the provided options, and updates the file.

## Options

| Option | Description |
| --- | --- |
| `--major` | Bumps the major version (e.g., `1.2.3` -> `2.0.0`). |
| `--minor` | Bumps the minor version (e.g., `1.2.3` -> `1.3.0`). |
| `--patch` | Bumps the patch version (e.g., `1.2.3` -> `1.2.4`). This is the default action if no other version-bumping flag is provided. |
| `-i, --prerelease-identifier [identifier]` | Handles prerelease versions. The behavior depends on how the flag is used:<br>- **`-i` (no identifier)**: Advances to the next prerelease identifier (`alpha` -> `beta` -> `rc`). If the current version is a release candidate (`rc`), it bumps the patch version and starts a new `alpha` cycle.<br>- **`-i <identifier>`**: Switches to the specified prerelease identifier. If the new identifier is lower in the hierarchy (`alpha` < `beta` < `rc`), it bumps the patch version. |
| `-n, --dry-run` | Displays the new version without modifying the `deno.json` file. Useful for previewing changes. |

## Examples

### Default Bumping

If no flags are provided, `bump` intelligently increments the lowest precedence part of the version.

-   Increment patch version for a stable release:
    ```sh
    # current version: 0.0.1
    bump
    # new version: 0.0.2
    ```
-   Increment prerelease number:
    ```sh
    # current version: 0.0.1-alpha.0
    bump
    # new version: 0.0.1-alpha.1
    ```

### Advancing Prerelease Cycle

Use the `-i` flag without an identifier to move through the prerelease cycle (`alpha` -> `beta` -> `rc`).

-   From `alpha` to `beta`:
    ```sh
    # current version: 0.0.1-alpha.5
    bump -i
    # new version: 0.0.1-beta.0
    ```
-   From `rc` to a new prerelease cycle for the next patch version:
    ```sh
    # current version: 0.2.1-rc.0
    bump -i
    # new version: 0.2.2-alpha.0
    ```

### Switching Prerelease Identifiers

Use `-i <identifier>` to switch to a specific prerelease identifier.

-   Switching to a higher identifier:
    ```sh
    # current version: 0.0.1-alpha.2
    bump -i rc
    # new version: 0.0.1-rc.0
    ```
-   Switching to a lower identifier (bumps the patch version):
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
