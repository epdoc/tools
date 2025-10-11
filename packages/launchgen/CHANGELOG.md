# Changelog for @epdoc/launchgen

All notable changes to this project will be documented in this file.

## [1.0.0-alpha.4] - 2025-10-11

- fixed issue with monorepos that don\'t have a packages subfolder

## [1.0.0-alpha.3] - 2025-10-11

- Resolved the duplicate --allow-all flag mystery by removing -A from the configuration.

## [1.0.0-alpha.2] - 2025-10-11

- Restrict launch.config.json creation to project root only
- Optimize launch configuration output by omitting default port and console values
- Compare port and console against top-level launch.json values instead of hardcoded defaults

## [1.0.0] - 2025-10-11

**🎉 Major Release - Complete Rewrite**

This is a major release with significant breaking changes and new features. The tool has been completely rewritten with
a modern architecture and comprehensive test suite.

### ✨ New Features

- **Workspace-Based Organization**: Launch configurations now use colon notation (`workspace: filename`) and are
  visually grouped in VS Code's debug dropdown
- **Enhanced Monorepo Support**: Full workspace support with hierarchical configuration merging
- **Auto-Generation**: Automatic creation of `launch.config.json` with sensible defaults when no configuration exists
- **Executable Export Discovery**: Automatically creates launch configurations for executable exports in `deno.json`
- **Comprehensive Testing**: Full unit test suite with BDD syntax and 100% coverage
- **Modern Architecture**: Complete rewrite with TypeScript classes using private fields (`#`) and protected methods

### 🔧 Configuration Changes

- **New Configuration Structure**: Groups now support both file-based (`includes`) and program-based (`program`)
  targeting
- **Enhanced Exclusion Patterns**: Default exclusions now include `**/.*` and `**/.*/**` for comprehensive hidden
  file/folder exclusion
- **Hierarchical Merging**: Improved configuration merging between root and workspace levels
- **Presentation Grouping**: VS Code presentation properties for visual organization

### 🚀 CLI Improvements

- **New `--init` Flag**: Force regenerate configuration files with current defaults
- **Enhanced `--dry-run`**: Better preview of changes with temporary file output
- **Improved Logging**: Detailed feedback about configuration generation and file discovery

### 🏗️ Architecture Changes

- **Class-Based Design**: `LaunchGenerator`, `ConfigLoader`, `FileFinder` classes with proper encapsulation
- **Type Safety**: Comprehensive TypeScript types and interfaces
- **Modern Dependencies**: Updated to latest Deno standard library and `@epdoc/fs`
- **Robust File Handling**: Improved glob pattern matching and file discovery

### 🧪 Testing

- **Comprehensive Test Suite**: Unit tests for all major components
- **BDD Syntax**: Tests use `describe`/`it` structure for clear organization
- **Isolated Testing**: Temporary file structures for test isolation
- **Edge Case Coverage**: Tests for complex scenarios and error conditions

### 💥 Breaking Changes

- **Workspace Naming**: Changed from slash notation to colon notation (`workspace: file`)
- **Configuration Structure**: New group-based configuration format
- **CLI Interface**: Updated command-line options and behavior
- **File Discovery**: Enhanced glob pattern handling may affect file matching
- **Dependencies**: Requires Deno 2.4+ and updated dependencies

### 📚 Documentation

- **Complete README Rewrite**: Comprehensive user guide with examples and migration information
- **Technical Specification**: Detailed SPEC.md for implementation reference
- **Migration Guide**: Clear upgrade path from v0.x to v1.0.0

## [0.7.15] - 2025-10-07

- Added features list that we need to work on.

## [0.7.14] - 2025-10-07

- Fixed console output of root folder

## [0.7.13] - 2025-10-07

- Fixed install script

## [0.7.12] - 2025-10-07

- Broke project into multiple files.
- Added unit tests for findRoot and workspaces.

## [0.7.11] - 2025-10-07

- Fixed findRoot

## [0.7.10] - 2025-10-07

- Converting to @epdoc/fs due to a miriad of fs problems.

## [0.7.9] - 2025-10-07

- Reverting project. Snapshot.

## [0.7.8] - 2025-10-06

- Fixed launchgen deno task install command.

## [0.7.7] - 2025-10-06

- Moved project to @epdoc/tools repo

## [0.7.6] - 2025-10-06

- Updated dependencies and unit tests

## [0.7.5] - 2025-09-24

- Added install script and updated [README.md](./README.md).
- Added workspace wildcard support.

## [0.7.0]

- **Custom Runtime Arguments:** You can now add custom runtime arguments to all auto-discovered test files by adding a
  `tests.runtimeArgs` property to your `launch.config.json` file. These arguments are appended to the default runtime
  arguments.
- **Improved Documentation:** The `README.md` has been updated to clarify the use of `deno.json` and
  `launch.config.json`, and to provide a clearer explanation of how launch configurations are generated.
- **Enhanced Unit Tests:** The unit tests have been refactored for better clarity and maintainability, and a new test
  has been added to verify the custom runtime arguments functionality.

## [0.6.0]

- **Test File Filtering:** You can now control which files are included and excluded from the test search by adding a
  `tests` object to your `deno.json` file. See the `README.md` for more details.
- **Hidden File Exclusion:** By default, all hidden files and directories (those starting with a `.`) are now excluded
  from the test search.

## [0.5.0]

This release introduces significant improvements to `launchgen.ts` for enhanced flexibility, maintainability, and
usability.

**Key Changes for Users:**

- **Generated Configuration Identification:** Generated `launch.json` configurations are now identified by the presence
  of an environment variable `LAUNCHGEN: "true"`.
- **`launch.config.json` Enhancements:**
  - You can now specify a global `port` (default: `9229`) and `console` type (default: `integratedTerminal`) directly in
    your `launch.config.json` file.
- **Automatic Runtime Detection:** The script now automatically detects whether your project is Deno or Node.js based on
  `deno.json` or `package.json`, generating appropriate launch configurations.
- **Improved Usage:** The `README.md` has been updated with clearer instructions for direct execution (using the
  shebang) and for importing `launchgen.ts` as a module in other scripts.

**Internal Changes (for developers extending `launchgen`):**

- The script has been refactored into an object-oriented `LaunchGenerator` class. Key methods are now `protected`,
  allowing for easier extension and customization via subclassing.
