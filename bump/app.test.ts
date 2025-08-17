import { expect } from 'jsr:@std/expect';
import { describe, it } from 'jsr:@std/testing/bdd';
import { AppMain } from './app.ts';
import { Context } from './context.ts';
import type { Opts } from './types.ts';
import type { DenoPkg } from '@epdoc/cliapp';

const runApp = async (version: string, opts: Partial<Opts> = {}) => {
  const app = new AppMain();
  const ctx = new Context();

  const config: DenoPkg = {
    name: 'test-pkg',
    description: 'A test package',
    version
  };
  return await app.run(ctx, opts as Opts, config);
};

describe('AppMain', () => {
  describe('default bump (no flags)', () => {
    it('should bump patch version for stable release', async () => {
      const newVersion = await runApp('0.0.1');
      expect(newVersion).toBe('0.0.2');
    });

    it('should bump prerelease version for prerelease', async () => {
      const newVersion = await runApp('0.0.1-alpha.0');
      expect(newVersion).toBe('0.0.1-alpha.1');
    });
  });

  describe('--patch flag', () => {
    it('should bump patch and remove prerelease tag', async () => {
      const newVersion = await runApp('0.0.6-rc.0', { patch: true });
      expect(newVersion).toBe('0.0.7');
    });
  });

  describe('-i flag (no value)', () => {
    it('should bump to next identifier', async () => {
      const newVersion = await runApp('0.0.1-alpha.5', { prereleaseIdentifier: true });
      expect(newVersion).toBe('0.0.1-beta.0');
    });

    it('should bump patch and start new alpha cycle from rc', async () => {
      const newVersion = await runApp('0.2.1-rc.0', { prereleaseIdentifier: true });
      expect(newVersion).toBe('0.2.2-alpha.0');
    });

    it('should bump patch and start new alpha cycle from stable', async () => {
      const newVersion = await runApp('0.2.2', { prereleaseIdentifier: true });
      expect(newVersion).toBe('0.2.3-alpha.0');
    });
  });

  describe('-i <identifier> flag', () => {
    it('should bump patch for lower identifier', async () => {
      const newVersion = await runApp('0.0.1-beta.2', { prereleaseIdentifier: 'alpha' });
      expect(newVersion).toBe('0.0.2-alpha.0');
    });

    it('should bump patch and start prerelease from stable', async () => {
      const newVersion = await runApp('0.0.7', { prereleaseIdentifier: 'alpha' });
      expect(newVersion).toBe('0.0.8-alpha.0');
    });

    it('should return undefined and not change for same identifier', async () => {
      const newVersion = await runApp('0.0.4-rc.0', { prereleaseIdentifier: 'rc' });
      expect(newVersion).toBeUndefined();
    });
  });

  describe('--major and --minor flags', () => {
    it('should bump major version', async () => {
      const newVersion = await runApp('0.1.0', { major: true });
      expect(newVersion).toBe('1.0.0');
    });

    it('should bump minor version', async () => {
      const newVersion = await runApp('0.1.0', { minor: true });
      expect(newVersion).toBe('0.2.0');
    });
  });
});