import { describe, it, expect, afterEach } from 'vitest';
import { ensurePageStyles, pageStyleHrefs, resetPageStyles } from '../../../src/public/js/utils/pageStyles.js';

const pageLinks = () => [...document.head.querySelectorAll('link[data-page-styles]')];
const finish = (href, event = 'load') => pageLinks().find(link => link.getAttribute('href') === href).dispatchEvent(new Event(event));

describe('page styles', () => {
  afterEach(() => {
    pageLinks().forEach(link => link.remove());
    document.getElementById('vanta-page-styles')?.remove();
    resetPageStyles();
  });

  it('links a bundle once and resolves when it has loaded', async () => {
    let done = false;
    const pending = ensurePageStyles(['admin']).then(() => { done = true; });
    ensurePageStyles(['admin']);
    expect(pageLinks().map(link => link.getAttribute('href'))).toEqual(['/css/bundles/admin.css']);

    await Promise.resolve();
    expect(done).toBe(false);
    finish('/css/bundles/admin.css');
    await pending;
    expect(done).toBe(true);
  });

  it("adds the player's own stylesheet and keeps the original order whatever loads first", async () => {
    const player = ensurePageStyles(['player']);
    const party = ensurePageStyles(['watch-party']);
    expect(pageLinks().map(link => link.getAttribute('href'))).toEqual([
      '/css/bundles/watch-party.css',
      '/css/bundles/player.css',
      '/vendor/player/vanta-player.css'
    ]);
    pageLinks().forEach(link => link.dispatchEvent(new Event('load')));
    await Promise.all([player, party]);
  });

  it('uses the hashed files the server names in production', () => {
    const data = document.createElement('script');
    data.type = 'application/json';
    data.id = 'vanta-page-styles';
    data.textContent = JSON.stringify({ admin: '/assets/admin-AbC123.css' });
    document.body.appendChild(data);

    expect(pageStyleHrefs(['admin', 'login'])).toEqual(['/assets/admin-AbC123.css', '/css/bundles/login.css']);
  });

  it('does not hold the page back when a stylesheet fails, and tries again next time', async () => {
    const first = ensurePageStyles(['login']);
    finish('/css/bundles/login.css', 'error');
    await first;
    pageLinks().forEach(link => link.remove());

    ensurePageStyles(['login']);
    expect(pageLinks()).toHaveLength(1);
  });

  it('resolves at once for a route without bundles', async () => {
    await expect(ensurePageStyles(undefined)).resolves.toBeUndefined();
  });
});
