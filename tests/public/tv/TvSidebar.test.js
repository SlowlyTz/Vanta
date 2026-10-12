import { describe, it, expect, vi } from 'vitest';
import { TvSidebar } from '../../../src/public/js/components/tv/TvSidebar.js';

describe('TvSidebar', () => {
  it('lists the areas without the admin area and marks the current one', () => {
    const sidebar = TvSidebar({});
    document.body.appendChild(sidebar.element);
    const labels = [...sidebar.element.querySelectorAll('.tv-sidebar-label')].map(el => el.textContent);
    expect(labels).toEqual(['Suche', 'Home', 'Filme', 'Serien', 'Meine Liste', 'Anfragen', 'Watch Party', 'Profil', 'Bildschirmschoner', 'Einstellungen']);
    expect(sidebar.element.dataset.tvGroup).toBe('nav');

    sidebar.update({ currentHash: '#/movies', user: { isAdmin: false } });
    expect(sidebar.element.querySelector('[aria-current="page"] .tv-sidebar-label').textContent).toBe('Filme');
    sidebar.update({ currentHash: '#/home', user: { isAdmin: true } });
    expect(sidebar.element.querySelector('[data-tv-key="nav-admin"]')).toBeNull();
    sidebar.element.remove();
  });

  it('opens the settings and the watch party from its buttons and knows when it holds the focus', () => {
    const onOpenSettings = vi.fn();
    const onOpenWatchParty = vi.fn();
    const sidebar = TvSidebar({ onOpenSettings, onOpenWatchParty });
    document.body.appendChild(sidebar.element);
    sidebar.element.querySelector('[data-tv-key="nav-settings"]').click();
    sidebar.element.querySelector('[data-tv-key="nav-party"]').click();
    expect(onOpenSettings).toHaveBeenCalled();
    expect(onOpenWatchParty).toHaveBeenCalled();

    sidebar.element.querySelector('[data-tv-key="nav-home"]').focus();
    expect(sidebar.isOpen()).toBe(true);
    const back = vi.fn();
    window.addEventListener('vanta:tv-focus-content', back);
    sidebar.close();
    expect(back).toHaveBeenCalledTimes(1);
    window.removeEventListener('vanta:tv-focus-content', back);
    document.body.innerHTML = '';
  });
});
