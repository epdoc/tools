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

Groups define sets of related launch configurations. Each group can target files using `includes` patterns or a specific
`program`.

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

### Group Properties Reference

| Property      | Type                     | Required | Description                                                      |
| ------------- | ------------------------ | -------- | ---------------------------------------------------------------- |
| `id`          | `string`                 | ✅       | Unique identifier for merging across files                       |
| `name`        | `string`                 | ✅       | Display name and base for launch config names                    |
| `includes`    | `string[]`               | *        | Glob patterns to find files (mutually exclusive with `program`)  |
| `excludes`    | `string[]`               |          | Additional exclude patterns                                      |
| `program`     | `string`                 | *        | Single executable file path (mutually exclusive with `includes`) |
| `runtimeArgs` | `string[]`               |          | Deno runtime arguments                                           |
| `scriptArgs`  | `string \| string[]`     |          | Default script arguments                                         |
| `scripts`     | `(string \| string[])[]` |          | Argument variations (creates multiple configs)                   |
| `port`        | `number`                 |          | Debug port (defaults to 9229)                                    |
| `console`     | `string`                 |          | VS Code console type                                             |

*One of `includes` or `program` is required.

### Console Types

| Value                | Description                     | Use Case                         |
| -------------------- | ------------------------------- | -------------------------------- |
| `internalConsole`    | VS Code Debug Console (default) | Most debugging scenarios         |
| `integratedTerminal` | VS Code integrated terminal     | Interactive apps, colored output |
| `externalTerminal`   | External terminal window        | Complex terminal interactions    |

### Debug Flags: `--inspect` vs `--inspect-brk`

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

Default exclusions (automatically applied):

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
├── deno.json               # Root config with workspaces
├── launch.config.json      # Optional dedicated config
├── packages/
│   ├── api/
│   │   ├── deno.json       # Workspace config
│   │   ├── src/
│   │   │   └── server.ts
│   │   └── tests/
│   │       └── api.test.ts
│   └── cli/
│       ├── deno.json
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

## 🔄 Migration from v0.x

Version 1.0.0 introduces several breaking changes:

### Configuration Changes

- **Workspace naming**: Now uses colon notation (`workspace: file`) instead of slash notation
- **Exclusion patterns**: Enhanced default exclusions include `**/.*/**` for hidden directories
- **Auto-generation**: Improved default configuration generation

### CLI Changes

- **New `--init` flag**: Force regenerate configuration files
- **Enhanced `--dry-run`**: Better preview of changes

### Behavior Changes

- **Workspace grouping**: Visual grouping in VS Code debug dropdown
- **Configuration merging**: Improved hierarchical merging logic
- **File discovery**: Better glob pattern handling

## 🤝 Contributing

This tool is part of the [`@epdoc/tools`](../../README.md) repository. Contributions welcome!

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Need help?** Check out the [specification](SPEC.md) for detailed technical information or open an issue on GitHub.
