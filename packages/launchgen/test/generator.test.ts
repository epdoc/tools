import { FileSpec, FolderSpec } from '@epdoc/fs';
import { assertEquals, assertExists } from '@std/assert';
import { LaunchGenerator } from '../src/generator.ts';
import type { Group, LaunchJson } from '../src/types.ts';

async function createTempProject(): Promise<FolderSpec> {
  const tempDir = await Deno.makeTempDir({ prefix: 'launchgen_test_' });
  return new FolderSpec(tempDir);
}

async function setupBasicProject(root: FolderSpec): Promise<void> {
  // Create .vscode directory
  const vscodeDirSpec = new FolderSpec(root, '.vscode');
  await vscodeDirSpec.ensureDir();

  // Create basic deno.json
  const denoJsonFile = new FileSpec(root, 'deno.json');
  await denoJsonFile.writeJson({
    name: 'test-project',
    version: '1.0.0',
  });
}

async function setupMonorepoProject(root: FolderSpec): Promise<void> {
  await setupBasicProject(root);

  // Update deno.json with workspaces
  const denoJsonFile = new FileSpec(root, 'deno.json');
  await denoJsonFile.writeJson({
    name: 'test-monorepo',
    version: '1.0.0',
    workspaces: ['packages/*'],
  });

  // Create workspace A
  const workspaceA = new FolderSpec(root, 'packages', 'workspace-a');
  await workspaceA.ensureDir();
  const denoJsonA = new FileSpec(workspaceA, 'deno.json');
  await denoJsonA.writeJson({
    name: 'workspace-a',
    version: '1.0.0',
  });

  // Create workspace B
  const workspaceB = new FolderSpec(root, 'packages', 'workspace-b');
  await workspaceB.ensureDir();
  const denoJsonB = new FileSpec(workspaceB, 'deno.json');
  await denoJsonB.writeJson({
    name: 'workspace-b',
    version: '1.0.0',
  });
}

async function createTestFiles(workspace: FolderSpec): Promise<void> {
  // Create test files
  const srcDir = new FolderSpec(workspace, 'src');
  await srcDir.ensureDir();
  await Deno.writeTextFile(new FileSpec(srcDir, 'utils.test.ts').path, '// Test file 1');

  const testsDir = new FolderSpec(workspace, 'tests');
  await testsDir.ensureDir();
  await Deno.writeTextFile(new FileSpec(testsDir, 'integration.test.ts').path, '// Test file 2');

  // Create runnable files
  const scriptsDir = new FolderSpec(workspace, 'scripts');
  await scriptsDir.ensureDir();
  await Deno.writeTextFile(new FileSpec(scriptsDir, 'deploy.run.ts').path, '// Runnable script');
}

Deno.test('LaunchGenerator - single project with auto-generated config', async () => {
  const root = await createTempProject();

  try {
    await setupBasicProject(root);
    await createTestFiles(root);

    const generator = new LaunchGenerator(root);
    await generator.run();

    // Check that launch.config.json was auto-generated
    const launchConfigFile = new FileSpec(root, 'launch.config.json');
    assertExists(await launchConfigFile.getIsFile());

    const launchConfig = await launchConfigFile.readJson() as { launch: { groups: Group[] } };
    assertEquals(launchConfig.launch.groups.length, 2); // test and run groups

    // Check that launch.json was created
    const launchJsonFile = new FileSpec(root, '.vscode', 'launch.json');
    assertExists(await launchJsonFile.getIsFile());

    const launchJson = await launchJsonFile.readJson<LaunchJson>();
    assertEquals(launchJson.version, '0.2.0');

    // Should have configurations for test files and run files
    const testConfigs = launchJson.configurations.filter((c) => c.name.includes('.test.ts'));
    const runConfigs = launchJson.configurations.filter((c) => c.name.includes('.run.ts'));

    assertEquals(testConfigs.length, 2); // 2 test files
    assertEquals(runConfigs.length, 1); // 1 run file

    // Verify configuration properties
    const testConfig = testConfigs[0];
    assertEquals(testConfig.type, 'node');
    assertEquals(testConfig.request, 'launch');
    assertEquals(testConfig.runtimeExecutable, 'deno');
    assertEquals(testConfig.env?.LAUNCHGEN, 'true');
  } finally {
    await Deno.remove(root.path, { recursive: true });
  }
});

Deno.test('LaunchGenerator - monorepo with workspace configurations', async () => {
  const root = await createTempProject();

  try {
    await setupMonorepoProject(root);

    const workspaceA = new FolderSpec(root, 'packages', 'workspace-a');
    const workspaceB = new FolderSpec(root, 'packages', 'workspace-b');

    await createTestFiles(workspaceA);
    await createTestFiles(workspaceB);

    const generator = new LaunchGenerator(root);
    await generator.run();

    const launchJsonFile = new FileSpec(root, '.vscode', 'launch.json');
    const launchJson = await launchJsonFile.readJson<LaunchJson>();

    // Should have configurations from both workspaces
    const workspaceAConfigs = launchJson.configurations.filter((c) => c.name.startsWith('workspace-a:'));
    const workspaceBConfigs = launchJson.configurations.filter((c) => c.name.startsWith('workspace-b:'));

    assertEquals(workspaceAConfigs.length, 3); // 2 test + 1 run
    assertEquals(workspaceBConfigs.length, 3); // 2 test + 1 run
  } finally {
    await Deno.remove(root.path, { recursive: true });
  }
});

Deno.test('LaunchGenerator - custom groups with program and scripts', async () => {
  const root = await createTempProject();

  try {
    await setupBasicProject(root);

    // Create a CLI program
    const cliFile = new FileSpec(root, 'cli.ts');
    await Deno.writeTextFile(cliFile.path, '// CLI program');

    // Create launch.config.json with custom group
    const launchConfigFile = new FileSpec(root, 'launch.config.json');
    await launchConfigFile.writeJson({
      launch: {
        port: 9230,
        console: 'integratedTerminal',
        groups: [
          {
            id: 'cli',
            name: 'CLI Tool',
            program: 'cli.ts',
            runtimeArgs: ['run', '-A', '--inspect-brk'],
            scriptArgs: ['--verbose'],
            scripts: ['', '--help', '--version'],
          },
        ],
      },
    });

    const generator = new LaunchGenerator(root);
    await generator.run();

    const launchJsonFile = new FileSpec(root, '.vscode', 'launch.json');
    const launchJson = await launchJsonFile.readJson<LaunchJson>();

    // Should have 3 configurations for the CLI (empty, --help, --version)
    const cliConfigs = launchJson.configurations.filter((c) => c.name.includes('CLI Tool'));
    assertEquals(cliConfigs.length, 3);

    // Check configuration details
    const helpConfig = cliConfigs.find((c) => c.name.includes('--help'));
    assertExists(helpConfig);
    assertEquals(helpConfig.attachSimplePort ?? launchJson.attachSimplePort, 9230);
    assertEquals(helpConfig.console ?? launchJson.console, 'integratedTerminal');
    assertEquals(helpConfig.args, ['--verbose', '--help']);
  } finally {
    await Deno.remove(root.path, { recursive: true });
  }
});

Deno.test('LaunchGenerator - preserves manual configurations', async () => {
  const root = await createTempProject();

  try {
    await setupBasicProject(root);

    // Create existing launch.json with manual configuration
    const launchJsonFile = new FileSpec(root, '.vscode', 'launch.json');
    await launchJsonFile.writeJson({
      version: '0.2.0',
      configurations: [
        {
          type: 'node',
          request: 'launch',
          name: 'Manual Config',
          program: 'manual.ts',
          runtimeExecutable: 'deno',
        },
      ],
      compounds: [
        {
          name: 'Test Compound',
          configurations: ['Manual Config'],
        },
      ],
    });

    const generator = new LaunchGenerator(root);
    await generator.run();

    const updatedLaunchJson = await launchJsonFile.readJson<LaunchJson>();

    // Manual configuration should be preserved
    const manualConfig = updatedLaunchJson.configurations.find((c) => c.name === 'Manual Config');
    assertExists(manualConfig);
    assertEquals(manualConfig.program, 'manual.ts');

    // Compounds should be preserved
    assertExists(updatedLaunchJson.compounds);
    assertEquals(updatedLaunchJson.compounds.length, 1);
  } finally {
    await Deno.remove(root.path, { recursive: true });
  }
});

Deno.test('LaunchGenerator - configuration merging between deno.json and launch.config.json', async () => {
  const root = await createTempProject();

  try {
    await setupBasicProject(root);

    // Create deno.json with launch config
    const denoJsonFile = new FileSpec(root, 'deno.json');
    await denoJsonFile.writeJson({
      name: 'test-project',
      launch: {
        port: 9229,
        groups: [
          {
            id: 'test',
            name: 'Tests',
            includes: ['**/*.test.ts'],
            runtimeArgs: ['test', '-A'],
          },
        ],
      },
    });

    // Create launch.config.json that overrides and extends
    const launchConfigFile = new FileSpec(root, 'launch.config.json');
    await launchConfigFile.writeJson({
      launch: {
        port: 9230, // Override port
        console: 'externalTerminal',
        groups: [
          {
            id: 'test', // Same ID - should merge
            runtimeArgs: ['test', '-A', '--inspect-brk'], // Override runtimeArgs
          },
          {
            id: 'custom',
            name: 'Custom',
            program: 'custom.ts',
            runtimeArgs: ['run', '-A'],
          },
        ],
      },
    });

    // Create test file
    const testFile = new FileSpec(root, 'example.test.ts');
    await Deno.writeTextFile(testFile.path, '// Test');

    const generator = new LaunchGenerator(root);
    await generator.run();

    const launchJsonFile = new FileSpec(root, '.vscode', 'launch.json');
    const launchJson = await launchJsonFile.readJson<LaunchJson>();

    // Should use merged configuration
    const testConfig = launchJson.configurations.find((c) => c.name === 'example.test.ts');
    assertExists(testConfig);
    assertEquals(testConfig.attachSimplePort ?? launchJson.attachSimplePort, 9230); // From launch.config.json
    assertEquals(testConfig.console ?? launchJson.console, 'externalTerminal'); // From launch.config.json
    assertEquals(testConfig.runtimeArgs, ['test', '-A', '--inspect-brk']); // Merged from launch.config.json
  } finally {
    await Deno.remove(root.path, { recursive: true });
  }
});

Deno.test('LaunchGenerator - executable exports auto-generation', async () => {
  const root = await createTempProject();

  try {
    await setupBasicProject(root);

    // Create deno.json with exports (no launch config to trigger auto-generation)
    const denoJsonFile = new FileSpec(root, 'deno.json');
    await denoJsonFile.writeJson({
      name: 'test-project',
      exports: {
        '.': './mod.ts', // Should be ignored (ends with mod.ts)
        'cli': './cli.ts', // Should be included
        'server': './server.ts', // Should be included
      },
    });

    // Create the export files
    await Deno.writeTextFile(new FileSpec(root, 'mod.ts').path, '// Module');
    await Deno.writeTextFile(new FileSpec(root, 'cli.ts').path, '// CLI');
    await Deno.writeTextFile(new FileSpec(root, 'server.ts').path, '// Server');

    const generator = new LaunchGenerator(root);
    await generator.run();

    // Check auto-generated launch.config.json
    const launchConfigFile = new FileSpec(root, 'launch.config.json');
    const launchConfig = await launchConfigFile.readJson() as { launch: { groups: Group[] } };

    // Should have test, run, cli, and server groups
    assertEquals(launchConfig.launch.groups.length, 4);

    const cliGroup = launchConfig.launch.groups.find((g: Group) => g.id === 'cli');
    const serverGroup = launchConfig.launch.groups.find((g: Group) => g.id === 'server');

    assertExists(cliGroup);
    assertExists(serverGroup);
    assertEquals(cliGroup.program, './cli.ts');
    assertEquals(serverGroup.program, './server.ts');
  } finally {
    await Deno.remove(root.path, { recursive: true });
  }
});
