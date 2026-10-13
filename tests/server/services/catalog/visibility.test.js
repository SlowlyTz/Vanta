import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getVisibleLibraryIds, clearVisibilityCache } from '../../../../src/server/services/catalog/visibility.js';

describe('getVisibleLibraryIds', () => {
  beforeEach(() => clearVisibilityCache());

  it('reads the enabled libraries from the user\'s own access policy', async () => {
    const fetchJson = vi.fn(async () => ({ Policy: { EnableAllFolders: false, EnabledFolders: ['lib-a', 'lib-b'] } }));

    expect(await getVisibleLibraryIds('u1', 't', { fetchJson })).toEqual(['lib-a', 'lib-b']);
    expect(fetchJson).toHaveBeenCalledWith('/Users/u1', { token: 't' });
  });

  it('answers null (no restriction) for access to every library', async () => {
    const fetchJson = vi.fn(async () => ({ Policy: { EnableAllFolders: true, EnabledFolders: [] } }));

    expect(await getVisibleLibraryIds('u1', 't', { fetchJson })).toBeNull();
  });

  it('caches the answer per user for ten minutes', async () => {
    let time = 0;
    const fetchJson = vi.fn(async () => ({ Policy: { EnableAllFolders: false, EnabledFolders: ['lib-a'] } }));
    const options = { fetchJson, now: () => time };

    await getVisibleLibraryIds('u1', 't', options);
    time += 9 * 60 * 1000;
    await getVisibleLibraryIds('u1', 't', options);
    expect(fetchJson).toHaveBeenCalledTimes(1);

    time += 2 * 60 * 1000;
    await getVisibleLibraryIds('u1', 't', options);
    expect(fetchJson).toHaveBeenCalledTimes(2);
  });

  it('keeps the last known answer while Jellyfin cannot be reached', async () => {
    let time = 0;
    const fetchJson = vi.fn(async () => ({ Policy: { EnableAllFolders: false, EnabledFolders: ['lib-a'] } }));
    await getVisibleLibraryIds('u1', 't', { fetchJson, now: () => time });

    time += 60 * 60 * 1000;
    fetchJson.mockRejectedValue(new Error('down'));
    expect(await getVisibleLibraryIds('u1', 't', { fetchJson, now: () => time })).toEqual(['lib-a']);
  });
});
