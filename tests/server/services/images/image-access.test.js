import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../src/server/config/env.js', () => ({
  default: { JELLYFIN_BASE_URL: 'http://jellyfin.test', JELLYFIN_API_KEY: 'k' }
}));

import { createImageAccess } from '../../../../src/server/services/images/image-access.js';

// `libraries`: id -> library id, or { libraryId, type, officialRating }.
const reader = (libraries) => ({
  accessOf: (id) => {
    const entry = libraries[id];
    if (entry === undefined) return undefined;
    return typeof entry === 'string' ? { libraryId: entry, type: 'Movie', officialRating: null } : entry;
  }
});

function setup({ libraries = {}, visible = ['lib-movies'], ageLimit = null, jellyfin = 200 } = {}) {
  let time = 0;
  const fetchItem = vi.fn(async () => (jellyfin instanceof Error ? Promise.reject(jellyfin) : { ok: jellyfin === 200, status: jellyfin }));
  const visibleLibraries = vi.fn(async () => ({ libraryIds: visible, ageLimit }));
  const access = createImageAccess({
    getReader: () => reader(libraries),
    catalogAccess: visibleLibraries,
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

  it('lets a user with access to every library see every catalogue title', async () => {
    const { access, fetchItem } = setup({ libraries: { k1: 'lib-kids-hidden' }, visible: null });
    expect(await ask(access, 'k1')).toBe(true);
    expect(fetchItem).not.toHaveBeenCalled();
  });

  it('keeps posters of titles above the account\'s age limit to itself', async () => {
    const { access, fetchItem } = setup({
      visible: null,
      ageLimit: { maxAge: 12, blockUnrated: ['Movie'] },
      libraries: {
        fsk12: { libraryId: 'lib-movies', type: 'Movie', officialRating: 'FSK-12' },
        fsk18: { libraryId: 'lib-movies', type: 'Movie', officialRating: 'FSK-18' },
        unratedMovie: { libraryId: 'lib-movies', type: 'Movie', officialRating: null },
        unratedSeries: { libraryId: 'lib-movies', type: 'Series', officialRating: null }
      }
    });
    expect(await ask(access, 'fsk12')).toBe(true);
    expect(await ask(access, 'fsk18')).toBe(false);
    expect(await ask(access, 'unratedMovie')).toBe(false);
    expect(await ask(access, 'unratedSeries')).toBe(true);
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
