import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../src/public/js/api/media.api.js', () => ({
  MediaApi: { getImageUrl: vi.fn((id, type) => `/img/${id}/${type}`) }
}));

import { normalizeJellyfinItem } from '../../../src/public/js/utils/normalize.js';

describe('normalizeJellyfinItem crew', () => {
  it('lists direction before the script, one card per person', () => {
    const { crew } = normalizeJellyfinItem({
      Id: 'm',
      Type: 'Movie',
      People: [
        { Id: 'w1', Name: 'Autor', Type: 'Writer' },
        { Id: 'd1', Name: 'Beide', Type: 'Director' },
        { Id: 'd1', Name: 'Beide', Type: 'Writer' },
        { Id: 'a1', Name: 'Spielerin', Type: 'Actor' }
      ]
    });
    expect(crew.map(person => [person.Id, person.job])).toEqual([['d1', 'Regie & Buch'], ['w1', 'Drehbuch']]);
  });

  it('takes the logo from Jellyfin when there is one', () => {
    expect(normalizeJellyfinItem({ Id: 'm', ImageTags: { Logo: 'x' } }).logoUrl).toBe('/img/m/Logo');
    expect(normalizeJellyfinItem({ Id: 'm' }).logoUrl).toBeNull();
  });
});
