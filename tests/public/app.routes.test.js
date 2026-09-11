import { describe, it, expect, vi } from 'vitest';

const added = [];

vi.mock('../../src/public/js/router.js', () => ({
  router: {
    add: (path, pageLoader, options = {}) => added.push({ path, pageLoader, options }),
    init: vi.fn()
  }
}));

vi.mock('../../src/public/js/realtime/app-realtime.js', () => ({ initAppRealtime: vi.fn() }));
vi.mock('../../src/public/js/components/watch-party/WatchPartyInvitationOverlay.js', () => ({
  mountWatchPartyInvitationOverlay: vi.fn()
}));

await import('../../src/public/js/app.js');

const route = (path) => added.find(entry => entry.path === path);

// Die Routentabelle selbst ist die Naht, an der der Admin-Umbau hängt: ein
// Tippfehler im Hash oder in defaultParams fällt sonst nirgends auf.
describe('Routentabelle', () => {
  it('registriert das Admin-Menü ohne Bereich', () => {
    expect(route('#/admin')).toBeTruthy();
    expect(route('#/admin').options).toEqual({ requiresAuth: true });
  });

  it.each([
    ['#/admin/requests', 'requests'],
    ['#/admin/users', 'users'],
    ['#/admin/settings', 'settings']
  ])('registriert %s mit dem passenden Bereich', (path, section) => {
    const entry = route(path);
    expect(entry).toBeTruthy();
    expect(entry.options).toEqual({ requiresAuth: true, defaultParams: { section } });
  });

  it('lädt alle vier Admin-Routen aus derselben Seite', async () => {
    const paths = ['#/admin', '#/admin/requests', '#/admin/users', '#/admin/settings'];
    const modules = await Promise.all(paths.map(path => route(path).pageLoader()));

    modules.forEach(module => expect(module.default).toBe(modules[0].default));
  });

  it('lässt die Bereichsrouten nicht von #/admin verschlucken', () => {
    // Der Router matcht anchored: ^#/admin$ trifft #/admin/users nicht.
    const regex = new RegExp('^' + route('#/admin').path.replace(/:([^/]+)/g, '([^/]+)') + '$');

    expect(regex.test('#/admin')).toBe(true);
    expect(regex.test('#/admin/users')).toBe(false);
  });

  it('behält die übrigen Routen unverändert', () => {
    expect(route('#/requests/new').options.defaultParams).toEqual({ view: 'new' });
    expect(route('#/item/:id')).toBeTruthy();
    expect(route('#/search').options).toEqual({ requiresAuth: true });
  });
});
