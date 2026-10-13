import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/server/config/env.js', () => ({ default: { JELLYFIN_BASE_URL: 'http://jellyfin.test', JELLYFIN_API_KEY: 'key' } }));
const { createUserDirectory } = await import('../../../src/server/services/user-directory.service.js');

const USERS = [
  { Id: 'a1', Name: 'Admin', Policy: { IsAdministrator: true, EnableAllFolders: true } },
  { Id: 'k1', Name: 'Kind', Policy: { EnableAllFolders: false, EnabledFolders: ['lib-kids'], MaxParentalRating: 12, BlockUnratedItems: ['Movie'] } },
  { Id: 'x1', Name: 'Weg', Policy: { IsDisabled: true } }
];

describe('UserDirectory', () => {
  it('knows access, parental limit and admins of the enabled users, and every account id', async () => {
    const fetchJson = vi.fn(async () => USERS);
    const directory = createUserDirectory({ fetchJson, apiKey: 'key' });
    expect(await directory.all()).toEqual([
      { id: 'a1', name: 'Admin', isAdmin: true, disabled: false, libraryIds: null, maxAge: null, blockUnrated: [] },
      { id: 'k1', name: 'Kind', isAdmin: false, disabled: false, libraryIds: ['lib-kids'], maxAge: 12, blockUnrated: ['Movie'] }
    ]);
    expect((await directory.admins()).map(user => user.id)).toEqual(['a1']);
    expect(await directory.allIds()).toEqual(new Set(['a1', 'k1', 'x1']));
    expect(fetchJson).toHaveBeenCalledTimes(1);
  });
});
