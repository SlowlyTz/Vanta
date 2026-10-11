import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../src/server/config/env.js', () => ({
  default: { JELLYFIN_BASE_URL: 'http://jellyfin.test', JELLYFIN_API_KEY: 'k' }
}));

import { createImageAccess } from '../../../../src/server/services/images/image-access.js';

const reader = (libraries) => ({ libraryOf: (id) => libraries[id] });

function setup({ libraries = {}, visible = ['lib-movies'], jellyfin = 200 } = {}) {
  let time = 0;
  const fetchItem = vi.fn(async () => (jellyfin instanceof Error ? Promise.reject(jellyfin) : { ok: jellyfin === 200, status: jellyfin }));
  const visibleLibraries = vi.fn(async () => visible);
  const access = createImageAccess({
    getReader: () => reader(libraries),
    visibleLibraries,
    fetchItem,
    now: () => time,
    log: { warn: vi.fn() }
  });
  return { access, fetchItem, visibleLibraries, advance: (ms) => { time += ms; } };
}

const ask = (access, itemId) => access.canSee({ userId: 'u1', token: 't', itemId });

describe('image access', () => {
  it('answers catalogue titles from the user\'s libraries without asking Jellyfin', async () => {
    const { access, fetchItem } = setup({ libraries: { m1: 'lib-movies', k1: 'lib-kids-hidden' } });
    expect(await ask(access, 'm1')).toBe(true);
    expect(await ask(access, 'k1')).toBe(false);
    expect(fetchItem).not.toHaveBeenCalled();
  });

  it('asks Jellyfin once for anything else and remembers the answer for a while', async () => {
    const { access, fetchItem, advance } = setup({ jellyfin: 404 });
    expect(await ask(access, 'episode-1')).toBe(false);
    expect(await ask(access, 'episode-1')).toBe(false);
    expect(fetchItem).toHaveBeenCalledTimes(1);
    expect(fetchItem).toHaveBeenCalledWith('u1', 't', 'episode-1');

    advance(10 * 60 * 1000);
    await ask(access, 'episode-1');
    expect(fetchItem).toHaveBeenCalledTimes(2);
  });

  it('does not deny when Jellyfin cannot answer', async () => {
    expect(await ask(setup({ jellyfin: new Error('timeout') }).access, 'person-1')).toBe(true);
    expect(await ask(setup({ jellyfin: 503 }).access, 'person-1')).toBe(true);
  });

  it('allows what Jellyfin returns for the user', async () => {
    expect(await ask(setup({ jellyfin: 200 }).access, 'season-1')).toBe(true);
  });

  it('refuses requests without a user or item', async () => {
    const { access } = setup();
    expect(await access.canSee({ userId: null, token: 't', itemId: 'x' })).toBe(false);
    expect(await access.canSee({ userId: 'u1', token: 't', itemId: '' })).toBe(false);
  });
});
