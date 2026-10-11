import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
  process.env.JELLYFIN_BASE_URL ||= 'http://jellyfin.test';
  process.env.JELLYFIN_API_KEY ||= 'key';
  process.env.TMDB_API_KEY ||= 'tmdb';
});

import { parseTrustProxy } from '../../../src/server/config/env.js';

describe('parseTrustProxy', () => {
  it('trusts loopback and private networks by default', () => {
    expect(parseTrustProxy(undefined)).toBe('loopback, linklocal, uniquelocal');
    expect(parseTrustProxy('  ')).toBe('loopback, linklocal, uniquelocal');
  });

  it('can be switched off or set to a hop count or address list', () => {
    expect(parseTrustProxy('false')).toBe(false);
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy('10.0.3.1')).toBe('10.0.3.1');
  });
});
