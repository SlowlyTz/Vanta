import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { APP_VERSION, formatVersion } from '../../../src/public/js/shared/version.js';

describe('APP_VERSION', () => {
  it('is a release number like 1.01 or 1.1', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+$/);
  });

  it('matches package.json (1.01 is 1.0.1, 1.1 is 1.1.0)', () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
    const [major, minor] = APP_VERSION.split('.');
    const expected = minor.length === 2
      ? `${Number(major)}.${Number(minor[0])}.${Number(minor[1])}`
      : `${Number(major)}.${Number(minor)}.0`;
    expect(pkg.version).toBe(expected);
  });

  it('formats for display', () => {
    expect(formatVersion('1.01')).toBe('Version 1.01');
    expect(formatVersion('')).toBe('');
  });
});
