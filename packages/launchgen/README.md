# @epdoc/launchgen

> **Version 1.0.0** - A VS Code launch configuration generator for Deno projects

Generate and maintain `.vscode/launch.json` files automatically for Deno projects, including monorepos. Discover test
files, runnable scripts, and executable exports with intelligent workspace-based organization.

## ✨ Features

- **🔍 Automatic Discovery**: Finds test files (`*.test.ts`), runnable scripts (`*.run.ts`), and executable exports
- **🏢 Monorepo Support**: Full workspace support with visual grouping in VS Code's debug dropdown
- **⚙️ Flexible Configuration**: Configure via `deno.json` or dedicated `launch.config.json` files
- **🎯 Smart Exclusions**: Automatically excludes `node_modules`, `.git`, and hidden files/folders
- **🔄 Preserves Manual Configs**: Keeps your custom launch configurations intact
- **🌟 Workspace Organization**: Groups configurations by workspace with colon notation (`workspace: filename`)
- **🚀 Auto-Generation**: Creates sensible defaults when no configuration exists

## 🚀 Quick Start

### Installation

Install globally using Deno:

```bash
deno install -f --global --name launchgen -A jsr:@epdoc/launchgen
```

Or run directly:

```bash
deno run -A jsr:@epdoc/launchgen
```

### Basic Usage

Navigate to your Deno project root (containing `.vscode` folder) and run:

```bash
launchgen
```

That's it! The tool will:

1. Discover your project structure
2. Auto-generate configuration files if needed
3. Create/update `.vscode/launch.json` with debug configurations

## 📋 Command Line Options

```bash
launchgen [options]
```

| Option          | Description                                                 |
| --------------- | ----------------------------------------------------------- |
| `-h, --help`    | Show help information                                       |
| `-v, --version` | Show version number                                         |
| `-n, --dry-run` | Preview changes without writing files                       |
| `--init`        | Force regenerate `launch.config.json` with current defaults |

## ⚙️ Configuration

### Configuration Files

The tool reads configuration from two possible locations:

1. **`deno.json`** - Add a `launch` property to your existing Deno config
2. **`launch.config.json`** - Dedicated configuration file (takes precedence)

If a `launch.config.json` file does not exist next to a `deno.json` file (either at the root or in a workspace),
`launchgen` will automatically generate one. The content of the generated file depends on whether it's at the project
root or in a workspace. See the "Auto-generation" section for more details.

> **Important:** Auto-generation runs only if `launch.config.json` is missing. Once the file is created, you are in
> control. New test files or runnable scripts that match existing `includes` patterns will be picked up automatically.
> However, if you add a new executable to `deno.json`'s `exports`, you must **manually add a corresponding group** to
> `launch.config.json` or regenerate the file by running `launchgen --init`.

### Basic Configuration Structure

```json
{
  "launch": {
    "port": 9229,
    "console": "internalConsole",
    "excludes": ["node_modules/**", ".git/**", "**/.*", "**/.*/**"],
    "groups": [
      {
        "id": "test",
        "name": "Tests",
        "includes": ["**/*.test.ts"],
        "runtimeArgs": ["test", "-A", "--inspect-brk"]
      },
      {
        "id": "run",
        "name": "Runnable",
        "includes": ["**/*.run.ts"],
        "runtimeArgs": ["run", "-A", "--inspect-brk"]
      }
    ]
  }
}
```

### Configuration Groups

Groups define sets of related launch configurations. Each group can target files using `includes` and `excludes`
patterns, or a specific `program`.

#### File-Based Groups (using `includes`)

```json
{
  "id": "test",
  "name": "Tests",
  "includes": ["**/*.test.ts", "tests/**/*.ts"],
  "excludes": ["**/*.integration.test.ts"],
  "runtimeArgs": ["test", "-A", "--inspect-brk"],
  "port": 9229,
  "console": "internalConsole"
}
```

`launchgen` will automatically use the `includes` and `exludes` list from your `deno.json` file's `test` property. You
do not need to redeclare them.

#### Program-Based Groups (using `program`)

```json
{
  "id": "cli",
  "name": "CLI Tool",
  "program": "src/cli.ts",
  "runtimeArgs": ["run", "-A", "--inspect-brk"],
  "scripts": ["", "--help", "--version", "build --prod"]
}
```

### Auto-generation

`launchgen` provides an auto-generation feature to get you started quickly. The behavior of auto-generation depends on
the location of the `deno.json` file.

#### Root Configuration

If a `launch.config.json` file does not exist at the root of your project, `launchgen` will create one with a minimal
configuration:

```json
{
  "$schema": "https://raw.githubusercontent.com/epdoc/tools/master/packages/launchgen/schemas/launch.schema.json",
  "launch": {
    "port": 9229,
    "console": "internalConsole",
    "excludes": [
      "node_modules/**",
      ".git/**",
      "**/.*",
      "**/.*/**"
    ],
    "runtimeExecutable": "/path/to/your/deno",
    "groups": []
  }
}
```

This provides a base configuration that can be extended by individual workspaces.

#### Workspace Configuration

If a workspace (e.g., a directory in `packages/`) contains a `deno.json` file but no `launch.config.json`, `launchgen`
will generate a full configuration for that workspace, including:

- A **"Tests"** group for files ending in `.test.ts`.
- A **"Runnable"** group for files ending in `.run.ts`.
- Groups for any **runnable exports** defined in the workspace's `deno.json`.

For example, if a workspace's `deno.json` has an export for `main.ts`, the generated `launch.config.json` will include a
group for it with `""` and `"--help"` as default script variants, providing a convenient starting point for CLI tools.

## launch.config.json Reference

This file, or the `launch` property in `deno.json`, configures the behavior of `launchgen`.

### Root Properties

| Property            | Type       | Description                                                                                                                                         |
| ------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `port`              | `number`   | _(Optional)_ The default debug port for all launch configurations. Defaults to `9229`.                                                              |
| `console`           | `string`   | _(Optional)_ The default console type to use. Can be `internalConsole`, `integratedTerminal`, or `externalTerminal`. Defaults to `internalConsole`. |
| `runtimeExecutable` | `string`   | _(Optional)_ The path to the Deno runtime executable. If not specified, it defaults to the path of the Deno executable that is running `launchgen`. |
| `excludes`          | `string[]` | _(Optional)_ An array of glob patterns to exclude from all groups.                                                                                  |
| `groups`            | `Group[]`  | _(Required)_ An array of configuration groups.                                                                                                      |

### Group Properties

| Property            | Type                     | Description                                                                                         |
| ------------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| `id`                | `string`                 | _(Required)_ A unique identifier for the group, used for merging configurations.                    |
| `name`              | `string`                 | _(Required)_ The display name for the group, used as a base for launch configuration names.         |
| `includes`          | `string[]`               | _(*)_ An array of glob patterns to include files for this group. Mutually exclusive with `program`. |
| `excludes`          | `string[]`               | _(Optional)_ An array of glob patterns to exclude files from this group.                            |
| `program`           | `string`                 | _(*)_ The path to a single executable file. Mutually exclusive with `includes`.                     |
| `runtimeExecutable` | `string`                 | _(Optional)_ The runtime executable to use for this group. Overrides the root `runtimeExecutable`.  |
| `runtimeArgs`       | `string[]`               | _(Optional)_ An array of arguments to pass to the Deno runtime.                                     |
| `scriptArgs`        | `string` or `string[]`   | _(Optional)_ Default arguments to pass to the script.                                               |
| `scripts`           | `(string or string[])[]` | _(Optional)_ An array of script variations. Each entry creates a separate launch configuration.     |
| `port`              | `number`                 | _(Optional)_ The debug port for this group. Overrides the root `port`.                              |
| `console`           | `string`                 | _(Optional)_ The console type for this group. Overrides the root `console`.                         |

_One of `includes` or `program` is required._

### Console Types

| Value                | Description                     | Use Case                         |
| -------------------- | ------------------------------- | -------------------------------- |
| `internalConsole`    | VS Code Debug Console (default) | Most debugging scenarios         |
| `integratedTerminal` | VS Code integrated terminal     | Interactive apps, colored output |
| `externalTerminal`   | External terminal window        | Complex terminal interactions    |

### runtimeArgs Flags: `--inspect` vs `--inspect-brk`

Both flags enable debugging for Deno processes, but they behave differently:

- **`--inspect`**: Starts the debugger and allows a debugger client to attach, but code runs immediately. Use this for
  attaching to already running applications.

- **`--inspect-brk`**: Starts the debugger and pauses execution on the first line, waiting for the debugger to connect
  before proceeding.

**For VS Code launch configurations, `--inspect-brk` is almost always preferred** because it:

- Ensures the debugger attaches before any code runs
- Allows setting breakpoints and stepping through from the very beginning
- Prevents missing early execution that might contain bugs

The tool will warn you if configurations are missing debug flags entirely.

## 🏢 Monorepo Support

### Workspace Configuration

Define workspaces in your root `deno.json`:

```json
{
  "workspaces": ["packages/*", "apps/*"]
}
```

Or using the singular form:

```json
{
  "workspace": ["./packages/*"]
}
```

### Workspace Organization

Launch configurations are automatically organized by workspace:

- **Root files**: `filename.test.ts`
- **Workspace files**: `workspace-name: filename.test.ts`
- **Visual grouping**: Configurations grouped in VS Code's debug dropdown

### Hierarchical Configuration

Configurations merge hierarchically:

1. **Root configuration** - Base settings
2. **Workspace configuration** - Overrides and extends root
3. **Final configuration** - Merged result

Example workspace override:

```json
// Root deno.json
{
  "launch": {
    "groups": [
      {
        "id": "test",
        "name": "Tests",
        "runtimeArgs": ["test", "-A", "--inspect-brk"]
      }
    ]
  }
}

// packages/api/launch.config.json
{
  "launch": {
    "groups": [
      {
        "id": "test",
        "runtimeArgs": ["test", "-A", "--inspect-brk", "--env=test"]
      }
    ]
  }
}
```

## 🔧 Advanced Usage

### Custom Executable Exports

The tool automatically creates configurations for executable exports in `deno.json`:

```json
{
  "exports": {
    ".": "./main.ts",
    "cli": "./src/cli.ts",
    "server": "./src/server.ts"
  }
}
```

This generates launch configurations for `cli` and `server` (excluding `mod.ts` files).

When auto-generating a configuration for an export, `launchgen` will automatically include `""` and `"--help"` as script
variants to provide a quick way to run the program with and without arguments.

`launchgen` determines if an export is "runnable" by inspecting the file. An exported file is considered runnable if it
meets **any** of the following criteria:

- It is named `main.ts` and located in the root of the workspace.
- It contains a hashbang (shebang) line (e.g., `#!/usr/bin/env -S deno run`).
- It uses the standard Deno pattern for executable scripts: `if (import.meta.main) { ... }` or
  `assert(import.meta.main, ...)`.

Files named `mod.ts` are always ignored, as they are conventionally used as entry points for importable libraries, not
executable applications.

### Complex Script Variations

Create multiple launch configurations for different argument combinations:

```json
{
  "id": "build",
  "name": "Build Tool",
  "program": "scripts/build.ts",
  "scripts": [
    "",
    "--watch",
    "--prod",
    "--prod --minify",
    ["--env", "staging", "--verbose"]
  ]
}
```

### Exclusion Patterns

Default exclusions (automatically included in `launch.config.json` file):

- `node_modules/**` - Dependencies
- `.git/**` - Git files
- `**/.*` - Hidden files
- `**/.*/**` - Hidden directories

Add custom exclusions:

```json
{
  "excludes": ["tmp/**", "dist/**", "coverage/**"]
}
```

## 🔍 How It Works

1. **Project Discovery**: Finds project root by locating `.vscode` directory
2. **Workspace Detection**: Discovers workspaces using glob patterns from `deno.json`
3. **Configuration Loading**: Loads and merges configurations hierarchically
4. **Auto-Generation**: Creates default configurations if none exist
5. **File Discovery**: Uses glob patterns to find matching files
6. **Launch Generation**: Creates VS Code launch configurations with workspace grouping
7. **Preservation**: Keeps existing manual configurations intact

## 📁 Project Structure Example

```
my-project/
├── .vscode/
│   └── launch.json          # Generated/updated by launchgen
├── deno.json                # Root config with workspaces
├── launch.config.json       # Optional dedicated config
├── packages/
│   ├── api/
│   │   ├── deno.json       # Workspace config
│   │   ├── src/
│   │   │   └── server.ts
│   │   └── tests/
│   │       └── api.test.ts
│   └── cli/
│       ├── deno.json
│       ├── launch.config.json # you can define all your launch groups here
│       ├── src/
│       │   └── main.ts
│       └── tests/
│           └── cli.test.ts
└── shared/
    └── utils.ts
```

Generated launch configurations:

- `api: tests/api.test.ts` (grouped under "api")
- `api: src/server.ts` (if configured)
- `cli: tests/cli.test.ts` (grouped under "cli")
- `cli: src/main.ts` (if configured)

## 🛠️ Integration

### VS Code Action Button

Add to your VS Code settings for quick access:

```json
{
  "actionButtons": {
    "commands": [
      {
        "name": "$(rocket) Launchgen",
        "command": "launchgen",
        "tooltip": "Update launch configurations",
        "singleInstance": true
      }
    ]
  }
}
```

### Programmatic Usage

Use as a module in your own tools:

```typescript
import { LaunchGenerator } from 'jsr:@epdoc/launchgen';
import { FolderSpec } from '@epdoc/fs';

const projectRoot = new FolderSpec('/path/to/project');
const generator = new LaunchGenerator(projectRoot, false, false);
await generator.run();
```

### CI/CD Integration

Validate configurations in CI:

```bash
# Check if configurations are up to date
launchgen --dry-run
```

## 🤝 Contributing

This tool is part of the [`@epdoc/tools`](../../README.md) repository. Contributions welcome!

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Need help?** Check out the [specification](SPEC.md) for detailed technical information or open an issue on GitHub.
