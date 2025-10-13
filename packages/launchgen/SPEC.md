# `launchgen` Specification v1.0.0

## 1. Overview

`launchgen` is a command-line tool that generates and updates `.vscode/launch.json` files for Deno projects. It
automatically discovers test files, runnable scripts, and executable exports within a project, including monorepos, and
creates the corresponding debug configurations.

The tool is configured through `deno.json` and optional `launch.config.json` files, allowing for flexible and powerful
customization of launch configurations.

## 2. Core Concepts

### 2.1. Project Root

The project root is the top-level directory of the user's project. It is identified by the presence of a `.vscode`
subdirectory.

### 2.2. Workspaces

A project can be a single project or a monorepo containing multiple workspaces. Workspaces are defined in the root
`deno.json` or `package.json` file using a `workspace` or `workspaces` property, which contains an array of glob
patterns (e.g., `"workspace": ["./packages/*"]`). Each directory matching a glob pattern that contains a `deno.json`
file is considered a workspace.

### 2.3. Launch Configuration Files

- **`deno.json`**: The standard Deno configuration file. It can contain launch configuration settings under the `launch`
  property.
- **`launch.config.json`**: An optional, dedicated file for launch configurations. If this file exists, its settings are
  merged with and take precedence over the settings in `deno.json`.

### 2.4. Configuration Groups

Launch configurations are organized into "groups". A group defines a set of common properties (like `runtimeArgs`,
`console`, etc.) and a method for discovering or defining debuggable targets. Each group will result in one or more
launch configurations in the final `launch.json` file.

### 2.5. Launch Configurations

A launch configuration is a single entry in the `configurations` array of the `launch.json` file. It represents a
specific debugging scenario (e.g., debugging a single test file, running an application with specific arguments).

### 2.6. Workspace-Based Organization

Launch configurations are organized by workspace using VS Code's `presentation` property for visual grouping. Each
workspace's configurations are grouped together in the debug dropdown using `presentation: { group: "workspaceName" }`.
Files that don't belong to any workspace appear ungrouped at the top level.

## 3. Command-Line Interface (CLI)

The tool is executed as a single command:

```bash
launchgen [options]
```

### 3.1. Options

- `-h, --help`: Show help information
- `-v, --version`: Show version number
- `-n, --dry-run`: Show what would be generated without writing files (writes to temp file for inspection)
- `--init`: Create/recreate launch.config.json with current defaults (useful for updating exclusion patterns)

The tool discovers the project root and configuration automatically, starting from the current working directory.

## 4. Configuration

### 4.1. Configuration Files and Priority

- The tool reads configuration from `deno.json` and `launch.config.json` files at the project root and in each workspace
  directory.

- Within a single directory, if both `deno.json` and `launch.config.json` exist, their `launch` objects are merged. This
  includes merging the `groups` arrays and any other top-level properties like `port` or `console`.

- If a group with the same `id` exists in both, the properties of the two group definitions are merged, with
  `launch.config.json` properties overriding those from `deno.json`.

### 4.2. `deno.json` Structure

Launch configurations are defined under the `launch` property.

```json
{
  "launch": {
    "port": 9229,
    "console": "internalConsole",
    "excludes": ["node_modules/**", ".git/**", ".*/**"],
    "groups": [
      {
        "id": "test",
        "name": "Tests",
        "includes": ["**/*.test.ts"]
      }
    ]
  }
}
```

### 4.3. `launch.config.json` Structure

This file contains a top-level `launch` object, which can define global defaults and contains the `groups` array. This
structure is identical to the `launch` property in `deno.json`.

```json
{
  "launch": {
    "port": 9229,
    "console": "internalConsole",
    "excludes": ["node_modules/**", ".git/**", ".*/**"],
    "groups": [
      {
        "id": "test",
        "name": "Tests",
        "runtimeArgs": ["test", "-A", "--inspect-brk"]
      }
    ]
  }
}
```

### 4.4. Top-Level Properties

| Property   | Type       | Description                                                                                                                               |
| ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `port`     | `number`   | The default debug port. Defaults to `9229`.                                                                                               |
| `console`  | `string`   | The default VS Code console to use. Can be `internalConsole`, `integratedTerminal`, or `externalTerminal`. Defaults to `internalConsole`. |
| `excludes` | `string[]` | Global exclude patterns applied to all groups with `includes`. Auto-generated configs include `["node_modules/**", ".git/**", ".*/**"]`.  |
| `groups`   | `Group[]`  | Array of configuration groups.                                                                                                            |

### 4.5. Group Properties

| Property      | Type                     | Description                                                                                                                                                    |
| ------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | `string`                 | **Required.** A unique identifier for the group, used for merging configurations across files.                                                                 |
| `name`        | `string`                 | **Required.** The name of the group. Used for UI separators in `launch.json` and as a base for launch configuration names.                                     |
| `includes`    | `string[]`               | An array of glob patterns to find files for this group. Mutually exclusive with `program`.                                                                     |
| `excludes`    | `string[]`               | An array of glob patterns to exclude files. Used with `includes`. Combined with top-level `excludes`.                                                          |
| `program`     | `string`                 | The path to a single executable file. Mutually exclusive with `includes`. The path should be relative to the workspace root.                                   |
| `runtimeArgs` | `string[]`               | Arguments to pass to the Deno runtime (e.g., `["run", "-A"]`).                                                                                                 |
| `scriptArgs`  | `string` or `string[]`   | Default arguments to pass to the script.                                                                                                                       |
| `scripts`     | `(string \| string[])[]` | An array of script argument variations. Each entry generates a separate launch configuration. Used only with `program`. An empty string `""` is a valid entry. |
| `port`        | `number`                 | The debug port. Defaults to top-level `port` or `9229`.                                                                                                        |
| `console`     | `string`                 | The VS Code console to use. Can be `internalConsole`, `integratedTerminal`, or `externalTerminal`. Defaults to top-level `console` or `internalConsole`.       |

### 4.5. Workspace Configuration Merging

- Configurations are resolved hierarchically. The tool starts with the root configuration and then merges in the
  configuration for each workspace.
- If a group with the same `id` exists in both a parent (e.g., root) and a workspace, their properties are merged.
- For any property defined in both the parent and the workspace group, the workspace's value is used.
- For array properties (`runtimeArgs`, `scriptArgs`, `includes`, `excludes`, `scripts`), the workspace's array
  completely replaces the parent's array.

## 5. Auto-generation of `launch.config.json`

- If a directory (either project root or a workspace) contains a `deno.json` but does _not_ contain a
  `launch.config.json` or a `launch` property in the `deno.json` file, a `launch.config.json` file will be created.
- The auto-generated file will contain a top-level `launch` object with default `console`, and `excludes` values and the
  following default groups in its `groups` array:
  1. A "test" group:
     - `id`: `"test"`
     - `name`: `"Tests"`
     - `includes`: `["**/*.test.ts"]`
     - `runtimeArgs`: `["test", "-A", "--inspect-brk"]`
     - `attachSimplePort`: `9229` (must be set on each configuration for debugger to work)

  2. A "run" group:
     - `id`: `"run"`
     - `name`: `"Runnable"`
     - `includes`: `["**/*.run.ts"]`
     - `runtimeArgs`: `["run", "-A", "--inspect-brk"]`
     - `attachSimplePort`: `9229` (must be set on each configuration for debugger to work)

  3. One group for each "executable" export found in the `deno.json` file's `exports` map.
     - An export is considered "executable" if its file path does not end in `mod.ts`.
     - `id`: The export key (e.g., `"my-cli"` or `"."`).
     - `name`: The export key, or filename without extension for main exports (e.g., `"."` becomes `"main"`).
     - `program`: The file path of the export.
     - `runtimeArgs`: `["run", "-A", "--inspect-brk"]`
     - `attachSimplePort`: `9229` (must be set on each configuration for debugger to work)
     - `scripts`: `[""]`

### 5.1. Default Excludes

Auto-generated configurations include top-level `excludes: ["node_modules/**", ".git/**", "**/.*", "**/.*/**"]` which
are applied to all groups with `includes` patterns. This excludes:

- `node_modules/**` - Node.js dependencies
- `.git/**` - Git repository files
- `**/.*` - Any files starting with a dot anywhere in the path (e.g., `.gitignore`, `.env`)
- `**/.*/**` - Any folders starting with a dot and their contents anywhere in the path (e.g., `test/.archive/`,
  `.vscode/`)

## 6. `launch.json` Generation

### 6.1. Process Overview

1. **Find Project Root:** Locate the project root by searching for a `.vscode` directory.
2. **Load Existing `launch.json`:** Read the existing `.vscode/launch.json` if it exists.
3. **Find Workspaces:** Identify all workspaces from the root `deno.json` or `package.json`.
4. **Process Configurations:** For the root and each workspace: a. Load and merge `deno.json` and `launch.config.json`.
   b. Auto-generate `launch.config.json` if needed. c. Merge the resulting configuration with the parent configuration.
5. **Generate Launch Configurations:** Based on the final, merged configuration for each workspace, generate the launch
   configurations with workspace-based organization.
6. **Write `launch.json`:** Write the new `configurations` array to `.vscode/launch.json`, preserving any manual entries
   and the `compounds` array.

### 6.2. Generating from Groups

- **For groups with `includes`:**
  - The tool will search for files matching the `includes` and `excludes` patterns within the workspace directory.
  - For each file found, a single launch configuration is generated.
  - The `name` of the launch configuration will be in the format: `workspace_name: relative/path/to/file.ts` for
    workspace files, or just `relative/path/to/file.ts` for root files.
- **For groups with `program`:**
  - The tool will iterate through the `scripts` array.
  - For each entry in `scripts`, a single launch configuration is generated.
  - The `name` of the launch configuration will be: `workspace_name: group.name script_entry` for workspace programs, or
    `group.name script_entry` for root programs. If the script entry is an empty string, the name is just the group
    name.

### 6.3. Workspace-Based Organization

- Launch configurations are organized by workspace using VS Code's `presentation` property.
- Workspace configurations include `presentation: { group: "workspaceName" }` for visual grouping.
- Root configurations (when no workspaces exist) have no presentation property and appear ungrouped.
- This creates visual separators in VS Code's debug configuration dropdown, grouping related configurations together.

### 6.4. Duplicate Prevention

- When workspaces are present, only workspace-specific configurations are generated.
- Root-level file processing is skipped to prevent duplicate entries for files that belong to workspaces.
- Each file appears only once in the appropriate workspace context.
- Root processing only occurs when no workspaces are defined (single project mode).

### 6.5. Preserving Manual Entries

- Any existing entry in the `launch.json` `configurations` array that does not correspond to a generated configuration
  will be preserved.
- The top-level `compounds` array in `launch.json` will be preserved untouched.

### 6.5. Preserving Manual Entries

- The tool will only manage launch configurations that are generated by it (identified by `env.LAUNCHGEN: 'true'`).
- Any existing entry in the `launch.json` `configurations` array that does not correspond to a generated configuration
  will be preserved, including their `presentation` properties.
- The top-level `compounds` array in `launch.json` will be preserved untouched.

### 6.6. Logging and Feedback

- The tool provides detailed logging of what files and configurations are being added.
- For file-based groups, each file is logged individually: `Adding workspace_name/path/to/file.ts`
- For program-based groups with scripts, the count is logged: `Adding 3 entries for CLI Tool`
- Workspace processing is logged: `Generated 12 configurations for workspace_name`

## 9. Testing Requirements

### 9.1. Test Coverage Standards

The tool must maintain comprehensive unit test coverage including:

- **File Finding Logic**: Tests must verify that `FileFinder` correctly implements glob pattern matching for both
  `includes` and `excludes` patterns, including:
  - Single and multiple include patterns
  - Exclude pattern functionality with proper precedence over includes
  - Default exclusion patterns (`node_modules/**`, `.git/**`, `**/.*`, `**/.*/**`)
  - Complex glob patterns with wildcards and directory traversal
  - Edge cases (empty arrays, no matches, etc.)

- **Configuration Loading and Merging**: Tests must verify hierarchical configuration merging between:
  - `deno.json` and `launch.config.json` files
  - Root and workspace-level configurations
  - Group-level property merging with proper precedence

- **Launch Configuration Generation**: Tests must verify:
  - Workspace-based organization with colon notation (`workspace: filename`)
  - Presentation grouping for VS Code integration
  - Auto-generation of default configurations
  - Executable export discovery and configuration
  - Manual configuration preservation

- **CLI Integration**: Tests must verify:
  - Dry-run mode functionality
  - Configuration initialization (`--init`)
  - Project root discovery
  - Error handling and validation

### 9.2. Test Quality Standards

All tests must:

- Use BDD syntax with `describe`/`it` structure for clear organization
- Create isolated temporary file structures to avoid dependencies on actual project files
- Test both positive and negative cases
- Include comprehensive edge case coverage
- Verify actual file system operations and generated output
- Use proper TypeScript typing without `any` types

### 9.3. Required Test Scenarios

The test suite must include scenarios for:

- Single project mode vs. monorepo mode
- Various workspace configurations and patterns
- File discovery with complex include/exclude combinations
- Configuration merging across multiple hierarchy levels
- Preservation of manual configurations during regeneration
- Auto-generation of configurations for executable exports
- Error conditions and malformed configurations

## 10. Implementation Details

### 10.1. Class Structure

- **`LaunchGenerator`**: The main class that orchestrates the entire process.
  - `run()`: The main entry point.
  - Constructor accepts optional `dryRun` parameter for dry-run mode.
- **`ConfigLoader`**: Responsible for finding, loading, merging, and auto-generating `deno.json` and
  `launch.config.json` files for a given directory (root or workspace).
- **`FileFinder`**: A utility class responsible for finding files based on `include` and `exclude` glob patterns. This
  leverages Deno's standard library for glob matching.
- **`Types`**: A file (`types.ts`) defining all the necessary TypeScript types and interfaces (e.g., `Group`,
  `LaunchConfiguration`, etc.).

### 10.2. File System Operations

- All file system operations prioritize the use of the `@epdoc/fs` library.
- The Deno standard library (`@std/fs`) is used for functionality not available in `@epdoc/fs`.

### 10.3. Dependencies

- `@epdoc/fs`
- `@epdoc/type`
- `@std/fs`
- `@std/path`

### 10.4. Default Exclusions

- Auto-generated groups include `excludes: [".*/**"]` to exclude any folders starting with a dot (e.g., `.git`,
  `.vscode`, `.archive`).
- This prevents hidden/system folders from being included in launch configurations.

## 11. Example Workflow

1. User runs `launchgen` or `launchgen --dry-run` in a project.
2. `LaunchGenerator` finds the project root at `/path/to/project`.
3. It finds workspaces `packages/a` and `packages/b`.
4. **Root processing:**
   - `ConfigLoader` loads `/path/to/project/deno.json`.
   - It sees no `launch.config.json`, so it generates one with default "test", "run", and executable export groups.
   - This becomes the "parent" configuration.
5. **Workspace `a` processing:**
   - `ConfigLoader` loads `/path/to/project/packages/a/deno.json` and `/path/to/project/packages/a/launch.config.json`.
   - It merges them, with `launch.config.json` taking priority.
   - It then merges this workspace configuration into the parent configuration. If group `test` exists in both, the
     workspace's `test` group properties override the parent's.
6. **Workspace `b` processing:**
   - Same as workspace `a`.
7. **Generation:**
   - `LaunchGenerator` creates workspace-based configurations with presentation grouping.
   - For a group with `includes: ["**/*.test.ts"]` in workspace `a`, `FileFinder` finds `packages/a/foo.test.ts`. A
     launch config named `a: foo.test.ts` with `presentation: { group: "a" }` is created.
   - For a group with `program: "cli.ts"` and `scripts: ["-h", "-v"]` in workspace `b`, two launch configs are created,
     named `b: CLI Tool -h` and `b: CLI Tool -v` with `presentation: { group: "b" }`.
8. **Final Output:**
   - The generated configurations use colon prefixes and presentation grouping for workspace organization.
   - Manual configurations are preserved with their original presentation properties.
   - The result is written to `.vscode/launch.json` (or temp file in dry-run mode).
