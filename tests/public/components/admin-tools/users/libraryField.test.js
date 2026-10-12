import { describe, it, expect } from 'vitest';
import { allLibrariesLabel, buildLibraryField } from '../../../../../src/public/js/components/admin-tools/users/adminUserDetailView/fields.js';

const LIBS = [
  { id: 'a', name: 'Filme', collectionType: 'movies', itemCount: 1 },
  { id: 'b', name: 'Serien', collectionType: 'tvshows', itemCount: 2 }
];

describe('library access field', () => {
  it('words "alle Bibliotheken" for none, one and many', () => {
    expect(allLibrariesLabel(0)).toBe('Sieht alle Bibliotheken.');
    expect(allLibrariesLabel(1)).toBe('Sieht alle Bibliotheken (zurzeit eine).');
    expect(allLibrariesLabel(4)).toBe('Sieht alle 4 Bibliotheken.');
  });

  it('says "Titel" and "Bibliothek" in the singular', () => {
    const field = buildLibraryField({ enableAllFolders: false, enabledFolders: ['a'] }, [LIBS[0]]);
    expect(field.element.querySelector('.admin-library-text').textContent).toContain('1 Titel');
    expect(field.element.querySelector('.admin-library-summary').textContent).toBe('Sieht 1 von 1 Bibliothek · 1 Titel');
  });

  it('has no change after switching "alle" off, ticking and on again', () => {
    const field = buildLibraryField({ enableAllFolders: true, enabledFolders: [] }, LIBS);
    const all = field.element.querySelector('input[role="switch"]');
    all.checked = false;
    all.dispatchEvent(new Event('change'));
    const tick = field.element.querySelector('.admin-library-check');
    tick.checked = true;
    tick.dispatchEvent(new Event('change'));
    expect(field.hasChanged()).toBe(true);
    all.checked = true;
    all.dispatchEvent(new Event('change'));
    expect(field.hasChanged()).toBe(false);
  });
});
