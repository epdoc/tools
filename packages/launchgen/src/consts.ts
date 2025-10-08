import type { LaunchSpec } from './types.ts';

export default {
  DEFAULT: { version: '0.2.0', configurations: [] } as LaunchSpec,
  CONFIG: 'launch.config.json',
  VSCODE: '.vscode',
};
