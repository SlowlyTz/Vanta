// Admin menu (#/admin): one card per area. The cards navigate to their own
// route, so they are plain buttons rather than tabs.
import { createElement } from '../../utils/dom.js';
import { createChevronIcon } from '../../components/navbar/icons.js';

export function createAdminMenu({ tools = [], onSelect } = {}) {
  const badges = new Map();

  const element = createElement('div', { className: 'admin-menu-grid' });

  tools.forEach(tool => {
    const badge = createElement('span', { className: 'admin-menu-badge hidden' }, '0');
    badges.set(tool.id, badge);

    element.appendChild(createElement('button', {
      className: 'admin-menu-card',
      type: 'button',
      onClick: () => onSelect?.(tool.id)
    },
      createElement('span', { className: 'admin-menu-card-icon', 'aria-hidden': 'true' }, tool.icon?.() || null),
      createElement('span', { className: 'admin-menu-card-text' },
        createElement('span', { className: 'admin-menu-card-title' }, tool.label),
        createElement('span', { className: 'admin-menu-card-description' }, tool.description || '')
      ),
      badge,
      createElement('span', { className: 'admin-menu-card-chevron', 'aria-hidden': 'true' }, createChevronIcon())
    ));
  });

  const setBadge = (id, count) => {
    const badge = badges.get(id);
    if (!badge) return;
    badge.textContent = String(count);
    badge.classList.toggle('hidden', !count);
  };

  return { element, setBadge };
}
