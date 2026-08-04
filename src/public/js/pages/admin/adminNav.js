import { createElement } from '../../utils/dom.js';

// Bereichsnavigation der Admin-Seite: dieselbe Markup-Struktur dient als
// seitliche Liste auf Desktop-Breiten und als Tab-Leiste auf Mobil, der
// Unterschied ist rein CSS (siehe css/pages/admin/responsive.css). Der aktive
// Bereich ist interner Zustand, keine eigene Route pro Bereich (siehe
// plan.md, "Offene Punkte" Nr. 2).
export function createAdminNav({ sections, onSelect }) {
  let activeId = sections[0]?.id ?? null;
  const badgeEls = new Map();
  const buttons = new Map();

  const element = createElement('nav', {
    className: 'admin-nav',
    role: 'tablist',
    'aria-label': 'Admin-Bereiche'
  });

  const render = () => {
    buttons.forEach((button, id) => {
      const active = id === activeId;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
  };

  const setActive = (id) => {
    if (id === activeId) return;
    activeId = id;
    render();
    onSelect?.(id);
  };

  const setBadge = (id, count) => {
    const badge = badgeEls.get(id);
    if (!badge) return;
    badge.textContent = String(count);
    badge.classList.toggle('hidden', !count);
  };

  sections.forEach(section => {
    const badge = createElement('span', { className: 'admin-nav-badge hidden' }, '0');
    badgeEls.set(section.id, badge);

    const button = createElement('button', {
      className: 'admin-nav-item',
      type: 'button',
      role: 'tab',
      'aria-selected': String(section.id === activeId),
      onClick: () => setActive(section.id)
    },
      createElement('span', { className: 'admin-nav-item-main' },
        section.icon || null,
        createElement('span', { className: 'admin-nav-label' }, section.label)
      ),
      badge
    );

    buttons.set(section.id, button);
    element.appendChild(button);
  });

  render();

  return { element, setActive, getActive: () => activeId, setBadge };
}
