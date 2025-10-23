import * as Bump from '$bump';
import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';

const ctx = new Bump.Context();

describe('AppMain', () => {
  describe('default bump (no flags)', () => {
    it('should bump patch version for stable release', () => {
      const newVersion = Bump.AppMain.increment(ctx, '0.0.1');
      expect(newVersion).toBe('0.0.2');
    });

    it('should bump prerelease version for prerelease', () => {
      const newVersion = Bump.AppMain.increment(ctx, '0.0.1-alpha.20');
      expect(newVersion).toBe('0.0.1-alpha.21');
    });
  });

  describe('--patch flag', () => {
    it('should finalize release for prerelease version', () => {
      const newVersion = Bump.AppMain.increment(ctx, '0.0.6-rc.10', { patch: true });
      expect(newVersion).toBe('0.0.6');
    });
  });

  describe('--release flag', () => {
    it('should remove prerelease identifier', () => {
      const newVersion = Bump.AppMain.increment(ctx, '0.2.1-alpha.3', { release: true });
      expect(newVersion).toBe('0.2.1');
    });

    it('should bump patch for stable release', () => {
      const newVersion = Bump.AppMain.increment(ctx, '0.2.1', { release: true });
      expect(newVersion).toBe('0.2.2');
    });
  });

  describe('-i flag (no value)', () => {
    it('should bump to next identifier', () => {
      const newVersion = Bump.AppMain.increment(ctx, '0.0.1-alpha.5', { prereleaseIdentifier: true });
      expect(newVersion).toBe('0.0.1-beta.0');
    });

    it('should finalize release from rc', () => {
      const newVersion = Bump.AppMain.increment(ctx, '0.2.1-rc.0', { prereleaseIdentifier: true });
      expect(newVersion).toBe('0.2.1');
    });

    it('should bump patch and start new alpha cycle from stable', () => {
      const newVersion = Bump.AppMain.increment(ctx, '0.2.2', { prereleaseIdentifier: true });
      expect(newVersion).toBe('0.2.3-alpha.0');
    });
  });

  describe('-i <identifier> flag', () => {
    it('should bump patch for lower identifier', () => {
      const newVersion = Bump.AppMain.increment(ctx, '0.0.1-beta.2', { prereleaseIdentifier: 'alpha' });
      expect(newVersion).toBe('0.0.2-alpha.0');
    });

    it('should bump patch and start prerelease from stable', () => {
      const newVersion = Bump.AppMain.increment(ctx, '0.0.7', { prereleaseIdentifier: 'alpha' });
      expect(newVersion).toBe('0.0.8-alpha.0');
    });

    it('should return undefined and not change for same identifier', () => {
      const newVersion = Bump.AppMain.increment(ctx, '0.0.4-rc.0', { prereleaseIdentifier: 'rc' });
      expect(newVersion).toBe('0.0.4-rc.1');
    });
  });

  describe('--major and --minor flags', () => {
    it('should bump major version', () => {
      const newVersion = Bump.AppMain.increment(ctx, '0.1.0', { major: true });
      expect(newVersion).toBe('1.0.0');
    });

    it('should bump minor version', () => {
      const newVersion = Bump.AppMain.increment(ctx, '0.1.3', { minor: true });
      expect(newVersion).toBe('0.2.0');
    });
    it('should finalize release from rc', () => {
      const newVersion = Bump.AppMain.increment(ctx, '0.2.1-rc.0', { minor: true });
      expect(newVersion).toBe('0.3.0');
    });
  });

  describe('--major and --minor flags with prerelease', () => {
    it('should bump minor version and start new prerelease cycle', () => {
      const newVersion = Bump.AppMain.increment(ctx, '2.0.5-alpha.2', { minor: true, prereleaseIdentifier: 'alpha' });
      expect(newVersion).toBe('2.1.0-alpha.0');
    });

    it('should bump major version and start new prerelease cycle', () => {
      const newVersion = Bump.AppMain.increment(ctx, '2.0.5-alpha.2', { major: true, prereleaseIdentifier: 'alpha' });
      expect(newVersion).toBe('3.0.0-alpha.0');
    });

    it('should bump minor version and graduate to stable', () => {
      const newVersion = Bump.AppMain.increment(ctx, '2.0.5-alpha.2', { minor: true });
      expect(newVersion).toBe('2.1.0');
    });

    it('should bump major version and graduate to stable', () => {
      const newVersion = Bump.AppMain.increment(ctx, '2.0.5-alpha.2', { major: true });
      expect(newVersion).toBe('3.0.0');
    });

    it('should bump minor version with specified identifier', () => {
      const newVersion = Bump.AppMain.increment(ctx, '2.0.5-alpha.2', { minor: true, prereleaseIdentifier: 'beta' });
      expect(newVersion).toBe('2.1.0-beta.0');
    });

    it('should bump major version with specified identifier', () => {
      const newVersion = Bump.AppMain.increment(ctx, '2.0.5-alpha.2', { major: true, prereleaseIdentifier: 'beta' });
      expect(newVersion).toBe('3.0.0-beta.0');
    });
  });
});
