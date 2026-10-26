import { describe, it, expect } from 'vitest';
import { formatTicksToDuration } from '../../../src/public/js/utils/format.js';

const minutes = value => value * 60 * 10_000_000;

describe('formatTicksToDuration', () => {
  it('writes run times in German', () => {
    expect(formatTicksToDuration(minutes(157))).toBe('2 Std. 37 Min.');
    expect(formatTicksToDuration(minutes(120))).toBe('2 Std.');
    expect(formatTicksToDuration(minutes(24))).toBe('24 Min.');
    expect(formatTicksToDuration(0)).toBe('');
  });
});
