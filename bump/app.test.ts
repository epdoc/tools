import { expect } from 'jsr:@std/expect';
import { describe, it } from 'jsr:@std/testing/bdd';
import { AppMain } from './app.ts';
import { Context } from './context.ts';

const ctx = new Context();

describe('AppMain', () => {
  describe('default bump (no flags)', () => {
    it('should bump patch version for stable release', () => {
      const newVersion = AppMain.increment(ctx, '0.0.1');
      expect(newVersion).toBe('0.0.2');
    });

    it('should bump prerelease version for prerelease', () => {
      const newVersion = AppMain.increment(ctx, '0.0.1-alpha.20');
      expect(newVersion).toBe('0.0.1-alpha.21');
    });
  });

  describe('--patch flag', () => {
    it('should finalize release for prerelease version', () => {
      const newVersion = AppMain.increment(ctx, '0.0.6-rc.10', { patch: true });
      expect(newVersion).toBe('0.0.6');
    });
  });

  describe('--release flag', () => {
    it('should remove prerelease identifier', () => {
      const newVersion = AppMain.increment(ctx, '0.2.1-alpha.3', { release: true });
      expect(newVersion).toBe('0.2.1');
    });

    it('should bump patch for stable release', () => {
      const newVersion = AppMain.increment(ctx, '0.2.1', { release: true });
      expect(newVersion).toBe('0.2.2');
    });
  });

  describe('-i flag (no value)', () => {
    it('should bump to next identifier', () => {
      const newVersion = AppMain.increment(ctx, '0.0.1-alpha.5', { prereleaseIdentifier: true });
      expect(newVersion).toBe('0.0.1-beta.0');
    });

    it('should finalize release from rc', () => {
      const newVersion = AppMain.increment(ctx, '0.2.1-rc.0', { prereleaseIdentifier: true });
      expect(newVersion).toBe('0.2.1');
    });

    it('should bump patch and start new alpha cycle from stable', () => {
      const newVersion = AppMain.increment(ctx, '0.2.2', { prereleaseIdentifier: true });
      expect(newVersion).toBe('0.2.3-alpha.0');
    });
  });

  describe('-i <identifier> flag', () => {
    it('should bump patch for lower identifier', () => {
      const newVersion = AppMain.increment(ctx, '0.0.1-beta.2', { prereleaseIdentifier: 'alpha' });
      expect(newVersion).toBe('0.0.2-alpha.0');
    });

    it('should bump patch and start prerelease from stable', () => {
      const newVersion = AppMain.increment(ctx, '0.0.7', { prereleaseIdentifier: 'alpha' });
      expect(newVersion).toBe('0.0.8-alpha.0');
    });

    it('should return undefined and not change for same identifier', () => {
      const newVersion = AppMain.increment(ctx, '0.0.4-rc.0', { prereleaseIdentifier: 'rc' });
      expect(newVersion).toBe('0.0.4-rc.1');
    });
  });

  describe('--major and --minor flags', () => {
    it('should bump major version', () => {
      const newVersion = AppMain.increment(ctx, '0.1.0', { major: true });
      expect(newVersion).toBe('1.0.0');
    });

    it('should bump minor version', () => {
      const newVersion = AppMain.increment(ctx, '0.1.3', { minor: true });
      expect(newVersion).toBe('0.2.0');
    });
    it('should finalize release from rc', () => {
      const newVersion = AppMain.increment(ctx, '0.2.1-rc.0', { minor: true });
      expect(newVersion).toBe('0.3.0');
    });
  });
});
