function svgIcon(path) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
}

const GEAR_ICON = '<path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84a.484.484 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.488.488 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.27.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 15.6 12 3.6 3.6 0 0 1 12 15.6z"/>';

export function formatBitrate(bitrate) {
  if (!bitrate) return '';
  if (bitrate >= 1_000_000) return `${(bitrate / 1_000_000).toFixed(0)} Mbit/s`;
  if (bitrate >= 1_000) return `${(bitrate / 1_000).toFixed(0)} kbit/s`;
  return `${bitrate} bit/s`;
}

export function formatProfileLabel(profile) {
  if (profile.id === 'auto') return 'Auto';
  if (profile.id === 'direct') return 'Direct Play';
  const bitrate = formatBitrate(profile.maxStreamingBitrate);
  return bitrate ? `${profile.label} (${bitrate})` : profile.label;
}

export function sortQualityProfiles(profiles) {
  const order = new Map([
    ['auto', 0],
    ['direct', 1],
    ['1080p', 2],
    ['720p', 3],
    ['480p', 4],
    ['360p', 5]
  ]);

  return [...profiles].sort((a, b) => {
    const orderA = order.get(a.id) ?? 99;
    const orderB = order.get(b.id) ?? 99;
    return orderA - orderB;
  });
}

export function createQualityMenu({ buttonContainer, menuContainer = buttonContainer, onSelect }) {
  let currentId = 'auto';
  let profiles = [];
  let isOpen = false;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'vanta-player-menu-button vanta-player-quality-button';
  button.setAttribute('aria-label', 'Qualität');
  button.setAttribute('aria-haspopup', 'true');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = svgIcon(GEAR_ICON);

  const menu = document.createElement('div');
  menu.className = 'vanta-player-menu vanta-player-quality-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Qualität wählen');
  menu.hidden = true;

  buttonContainer.insertBefore(button, buttonContainer.firstChild);
  menuContainer.appendChild(menu);

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    menu.querySelectorAll('[role="menuitem"]').forEach(item => item.setAttribute('tabindex', '-1'));
  };

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    const items = menu.querySelectorAll('[role="menuitem"]');
    items.forEach((item, index) => item.setAttribute('tabindex', index === 0 ? '0' : '-1'));
    items[0]?.focus();
  };

  const toggle = () => {
    if (isOpen) close();
    else open();
  };

  const update = (nextProfiles, nextCurrentId) => {
    profiles = sortQualityProfiles(nextProfiles || []);
    currentId = nextCurrentId || 'auto';

    menu.innerHTML = profiles.map(profile => {
      const selected = profile.id === currentId;
      return `
        <button
          type="button"
          class="vanta-player-menu-item${selected ? ' is-selected' : ''}"
          role="menuitem"
          data-quality-profile="${profile.id}"
          tabindex="-1"
          aria-checked="${selected ? 'true' : 'false'}"
        >
          <span class="vanta-player-menu-item-label">${formatProfileLabel(profile)}</span>
          ${selected ? '<span class="vanta-player-menu-item-check" aria-hidden="true">✓</span>' : ''}
        </button>`;
    }).join('');
  };

  const handleKeyDown = event => {
    if (!isOpen) return;
    const items = [...menu.querySelectorAll('[role="menuitem"]')];
    const currentIndex = items.findIndex(item => document.activeElement === item);

    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      button.focus();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      items[nextIndex]?.focus();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      items[prevIndex]?.focus();
    }
  };

  button.addEventListener('click', toggle);
  menu.addEventListener('click', event => {
    const item = event.target.closest('[data-quality-profile]');
    if (!item) return;
    event.stopPropagation();
    const profileId = item.dataset.qualityProfile;
    if (profileId === currentId) {
      close();
      return;
    }
    onSelect(profileId);
    close();
  });
  menu.addEventListener('keydown', handleKeyDown);

  const handleDocumentClick = event => {
    if (!isOpen) return;
    if (!menu.contains(event.target) && !button.contains(event.target)) {
      close();
    }
  };
  document.addEventListener('click', handleDocumentClick);

  return {
    button,
    update,
    open,
    close,
    destroy: () => {
      close();
      button.removeEventListener('click', toggle);
      menu.removeEventListener('click', event => {
        const item = event.target.closest('[data-quality-profile]');
        if (!item) return;
        event.stopPropagation();
        onSelect(item.dataset.qualityProfile);
        close();
      });
      menu.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleDocumentClick);
      button.remove();
      menu.remove();
    }
  };
}
