## Deno.json Test Configuration Syntax

### Complete Syntax Specification

```json
{
  "test": {
    "include": [
      "pattern1",
      "pattern2"
    ],
    "exclude": [
      "pattern3",
      "pattern4"
    ]
  }
}
```

**Pattern Syntax:**

- **Glob patterns** using minimatch syntax
- **Relative paths** from project root
- **File extensions**: `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts`
- **Directories** (will match all test files within)
- **Negation patterns** (starting with `!`)

### Common Pattern Examples

```json
{
  "test": {
    "include": [
      "src/**/*.test.ts",
      "src/**/*.spec.ts",
      "tests/**/*.ts"
    ],
    "exclude": [
      "src/**/*.d.ts",
      "src/**/test-utils/**",
      "!src/**/*.important.test.ts", // negation - include despite other excludes
      "node_modules/**",
      "**/dist/**"
    ]
  }
}
```

### TypeScript Interface Definition

```typescript
interface DenoConfig {
  test?: {
    include?: string[];
    exclude?: string[];
  };
}
```

## TypeScript Search Implementation

### 1. Basic Pattern Matching

```typescript
import { minimatch } from 'https://deno.land/x/minimatch@v1.2.0/mod.ts';

interface TestConfig {
  include: string[];
  exclude: string[];
}

class DenoTestMatcher {
  private config: TestConfig;

  constructor(config: TestConfig) {
    this.config = {
      include: config.include || [],
      exclude: config.exclude || [],
    };
  }

  isTestFile(filePath: string): boolean {
    // Normalize path for consistent matching
    const normalizedPath = filePath.replace(/\\/g, '/');

    // Check if file is included by any pattern
    const isIncluded = this.config.include.length === 0 ||
      this.config.include.some((pattern) => this.matchesPattern(normalizedPath, pattern));

    // Check if file is excluded by any pattern
    const isExcluded = this.config.exclude.some((pattern) => this.matchesPattern(normalizedPath, pattern));

    return isIncluded && !isExcluded;
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // Handle negation patterns
    if (pattern.startsWith('!')) {
      return !minimatch(filePath, pattern.slice(1));
    }

    return minimatch(filePath, pattern);
  }

  // Find all test files in a directory
  async findTestFiles(rootDir: string = '.'): Promise<string[]> {
    const testFiles: string[] = [];

    for await (const entry of Deno.readDir(rootDir)) {
      const fullPath = `${rootDir}/${entry.name}`.replace(/\\/g, '/');

      if (entry.isDirectory) {
        // Recursively search directories
        if (!this.isExcludedDirectory(fullPath)) {
          const subDirFiles = await this.findTestFiles(fullPath);
          testFiles.push(...subDirFiles);
        }
      } else if (entry.isFile && this.isTestFile(fullPath)) {
        testFiles.push(fullPath);
      }
    }

    return testFiles;
  }

  private isExcludedDirectory(dirPath: string): boolean {
    return this.config.exclude.some((pattern) => minimatch(dirPath, pattern) || minimatch(dirPath + '/**'));
  }
}
```

### 2. Advanced Search with Caching

```typescript
interface SearchOptions {
  rootDir?: string;
  maxDepth?: number;
  fileExtensions?: string[];
}
```

### 3. Usage Examples

```typescript
// Example configuration matching deno.json
const testConfig: TestConfig = {
  include: [
    'src/**/*.test.ts',
    'src/**/*.spec.ts',
    'tests/**/*.ts',
  ],
  exclude: [
    'src/**/*.d.ts',
    'src/**/test-utils/**',
    '**/node_modules/**',
  ],
};

// Initialize searcher
const searcher = new AdvancedTestSearcher(testConfig);

// Find all test files
async function main() {
  const testFiles = await searcher.searchTestFiles({
    rootDir: '.',
    maxDepth: 5,
  });

  console.log('Found test files:');
  testFiles.forEach((file) => console.log(`- ${file}`));

  // Check individual files
  console.log('\nIndividual file checks:');
  const filesToCheck = [
    'src/module.test.ts',
    'src/module.ts',
    'src/test-utils/helper.test.ts',
  ];

  filesToCheck.forEach((file) => {
    const isTest = searcher.matcher.isTestFile(file);
    console.log(`${file}: ${isTest ? 'TEST' : 'NOT TEST'}`);
  });
}

// Run the search
main().catch(console.error);
```

### 4. Integration with Deno's Native Test Runner

```typescript
// Utility to get test files for Deno.test
async function getTestFilesFromConfig(): Promise<string[]> {
  try {
    const configText = await Deno.readTextFile('./deno.json');
    const config = JSON.parse(configText) as DenoConfig;

    if (config.test) {
      const searcher = new AdvancedTestSearcher({
        include: config.test.include || [],
        exclude: config.test.exclude || [],
      });

      return await searcher.searchTestFiles();
    }
  } catch (error) {
    console.warn('Could not read deno.json, using default patterns');
  }

  // Fallback to default patterns
  const defaultSearcher = new AdvancedTestSearcher({
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  });

  return await defaultSearcher.searchTestFiles();
}

// Use with Deno.test
async function runConfiguredTests() {
  const testFiles = await getTestFilesFromConfig();

  for (const file of testFiles) {
    console.log(`Importing and running tests from: ${file}`);
    await import(`file://${Deno.cwd()}/${file}`);
  }
}
```

This implementation provides:

- Complete pattern matching following Deno's specification
- Efficient directory traversal with caching
- Type-safe configuration interfaces
- Integration with Deno's native file system APIs
- Support for complex glob patterns and negation
- Extensible architecture for custom search requirements

# Followup

Yes! My answer will **definitely explain minimatch/glob syntax** and provide code examples. Here's what you'll find when
you read it later:

## Glob Pattern Explanation Included:

### Basic Glob Syntax:

- `*` - matches any characters within a filename
- `**` - matches any characters across directories
- `?` - matches any single character
- `[abc]` - matches any character in the set
- `{pattern1,pattern2}` - matches either pattern

### Concrete Examples:

```json
{
  "include": [
    "src/**/*.test.ts", // All test files in src and subdirectories
    "tests/*.spec.ts", // Spec files directly in tests folder
    "**/*.test.{ts,js}", // Test files with .ts or .js extension
    "src/modules/??-*.ts" // Files like "01-module.test.ts"
  ],
  "exclude": [
    "**/node_modules/**", // Exclude node_modules entirely
    "src/**/*.d.ts", // Exclude type declaration files
    "!src/**/*.important.test.ts" // Negation - include this despite other rules
  ]
}
```

### TypeScript Implementation:

The code I provide includes a complete `DenoTestMatcher` class that uses the minimatch library to handle all these
pattern types, with clear examples of how to test files against glob patterns.

You'll be able to copy-paste the working code and understand exactly how each glob pattern works!
