import { createElement } from '../../utils/dom.js';
import { createSettingsGearIcon, createChevronIcon, createIcon } from '../../components/navbar/icons.js';
import { createAdminDiscordPage } from './adminDiscordPage.js';
import { createAdminCatalogPage } from './adminCatalogPage.js';
import { openAdminLayer } from './adminLayer.js';

const ICONS = {
  discord: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>`,
  catalog: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5.5" rx="8" ry="2.5"></ellipse><path d="M4 5.5v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-6"></path><path d="M4 11.5v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-6"></path></svg>`
};

// Menu entry of this area. The icon is a factory, not a node: the menu builds
// its own card per tool and a single shared node could only ever live in one
// of them.
export const ADMIN_SETTINGS_TOOL = {
  id: 'settings',
  label: 'Einstellungen',
  description: 'Discord-Webhook und Katalog-Abgleich',
  icon: () => createSettingsGearIcon()
};

// Die Unterseiten der Einstellungen, in Listenreihenfolge.
const PAGES = [
  { id: 'discord', title: 'Discord-Webhook', hint: 'Nachricht bei neuen Medienanfragen', icon: 'discord', create: createAdminDiscordPage },
  { id: 'catalog', title: 'Katalog', hint: 'Abgleich mit Jellyfin und Zeitplan', icon: 'catalog', create: createAdminCatalogPage }
];

// Einstellungen-Bereich der Admin-Seite (#/admin/settings), aufgebaut wie die
// Einstellungen am Handy: eine Liste, jeder Eintrag öffnet seine Seite als
// Ebene, die von rechts hereinfährt und mit "Zurück" wieder hinaus.
export function createAdminSettingsPanel() {
  let openLayer = null;
  let openPage = null;

  const openSubPage = page => {
    if (openLayer) return;
    openPage = page.create();
    openLayer = openAdminLayer({
      title: page.title,
      content: openPage.element,
      onClose: () => {
        openPage?.deactivate?.();
        openPage?.destroy?.();
        openPage = null;
        openLayer = null;
      }
    });
    openPage.activate?.();
  };

  const rows = PAGES.map(page => {
    const icon = createIcon('admin-settings-list-icon', ICONS[page.icon]);
    return createElement('button', {
      className: 'admin-settings-list-row',
      type: 'button',
      dataset: { page: page.id },
      onClick: () => openSubPage(page)
    },
      icon,
      createElement('span', { className: 'admin-settings-list-text' },
        createElement('span', { className: 'admin-settings-list-title' }, page.title),
        createElement('span', { className: 'admin-settings-list-hint' }, page.hint)
      ),
      createElement('span', { className: 'admin-settings-list-chevron', 'aria-hidden': 'true' }, createChevronIcon())
    );
  });

  const element = createElement('section', {
    className: 'admin-settings-panel',
    'aria-label': 'Admin-Einstellungen'
  },
    createElement('div', { className: 'admin-settings-list' }, ...rows)
  );

  return {
    ...ADMIN_SETTINGS_TOOL,
    element,
    openPage: id => {
      const page = PAGES.find(entry => entry.id === id);
      if (page) openSubPage(page);
    },
    // The route changed: the layer lives on document.body and must go at once.
    destroy: () => openLayer?.close({ immediate: true })
  };
}
