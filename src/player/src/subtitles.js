import {
  CLOSE_PLAYER_MENUS_EVENT,
  requestClosePlayerMenus,
  shouldCloseForMenuRequest,
  stopPlayerMenuClick,
  stopPlayerMenuPointerEvent
} from './menuEvents.js';

function svgIcon(path) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
}

const SUBTITLE_ICON = '<path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM10 11H8.5v-.5h-2v3h2V13H10v1c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm9 0h-1.5v-.5h-2v3h2V13H19v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/>';
const OFF_ID = 'off';

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeLanguage(language) {
  return String(language || '').trim();
}

export function formatSubtitleLabel(track) {
  if (!track) return 'Aus';
  const label = track.label || track.language || `Untertitel ${track.index}`;
  return track.isForced ? `${label} · Forced` : label;
}

export function sortSubtitleTracks(tracks) {
  return [...(tracks || [])].sort((a, b) => {
    if (a.isForced !== b.isForced) return a.isForced ? -1 : 1;
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return Number(a.index) - Number(b.index);
  });
}

export function createSubtitleMenu({
  buttonContainer,
  menuContainer = buttonContainer,
  player,
  reporter
}) {
  let currentId = OFF_ID;
  let tracks = [];
  let registeredIds = new Set();
  let isOpen = false;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'vanta-player-menu-button vanta-player-subtitle-button';
  button.setAttribute('aria-label', 'Untertitel');
  button.setAttribute('aria-haspopup', 'true');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = svgIcon(SUBTITLE_ICON);
  button.hidden = true;

  const menu = document.createElement('div');
  menu.className = 'vanta-player-menu vanta-player-subtitle-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Untertitel wählen');
  menu.hidden = true;

  buttonContainer.insertBefore(button, buttonContainer.firstChild);
  menuContainer.appendChild(menu);

  const getTrackId = track => `vanta-subtitle-${track.index}`;

  const findRegisteredTrack = id => player.textTracks?.getById?.(id) || null;

  const setTrackMode = (track, mode) => {
    if (!track) return;
    if (typeof track.setMode === 'function') track.setMode(mode);
    else track.mode = mode;
  };

  const removeRegisteredTracks = () => {
    if (!player.textTracks) {
      registeredIds = new Set();
      return;
    }

    registeredIds.forEach(id => {
      const track = findRegisteredTrack(id);
      if (track && typeof player.textTracks.remove === 'function') {
        player.textTracks.remove(track);
      } else {
        setTrackMode(track, 'disabled');
      }
    });
    registeredIds = new Set();
  };

  const registerTracks = nextTracks => {
    removeRegisteredTracks();
    nextTracks.forEach(track => {
      const id = getTrackId(track);
      registeredIds.add(id);
      player.textTracks?.add?.({
        id,
        src: track.url,
        type: track.type,
        kind: 'subtitles',
        label: formatSubtitleLabel(track),
        language: normalizeLanguage(track.language),
        default: false
      });
      setTrackMode(findRegisteredTrack(id), 'disabled');
    });
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    menu.querySelectorAll('[role="menuitem"]').forEach(item => item.setAttribute('tabindex', '-1'));
  };

  const open = () => {
    if (isOpen || button.hidden) return;
    requestClosePlayerMenus(menu);
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

  const applySelection = nextId => {
    const selected = tracks.find(track => getTrackId(track) === nextId);
    currentId = selected ? nextId : OFF_ID;

    registeredIds.forEach(id => {
      setTrackMode(findRegisteredTrack(id), id === currentId ? 'showing' : 'disabled');
    });

    reporter.setSubtitleStreamIndex(selected ? selected.index : null);
    render();
  };

  const render = () => {
    const options = [
      { id: OFF_ID, label: 'Aus' },
      ...tracks.map(track => ({ id: getTrackId(track), label: formatSubtitleLabel(track) }))
    ];

    button.hidden = tracks.length === 0;
    if (button.hidden) close();

    menu.innerHTML = options.map(option => {
      const selected = option.id === currentId;
      return `
        <button
          type="button"
          class="vanta-player-menu-item${selected ? ' is-selected' : ''}"
          role="menuitem"
          data-subtitle-track="${escapeHtml(option.id)}"
          tabindex="-1"
          aria-checked="${selected ? 'true' : 'false'}"
        >
          <span class="vanta-player-menu-item-label">${escapeHtml(option.label)}</span>
          ${selected ? '<span class="vanta-player-menu-item-check" aria-hidden="true">✓</span>' : ''}
        </button>`;
    }).join('');
  };

  const update = (playback, { preserveSelection = true } = {}) => {
    const nextTracks = sortSubtitleTracks(playback?.subtitles || []);
    const previousId = currentId;

    tracks = nextTracks;
    registerTracks(tracks);

    const shouldPreserve = preserveSelection
      && previousId !== OFF_ID
      && tracks.some(track => getTrackId(track) === previousId);

    applySelection(shouldPreserve ? previousId : OFF_ID);
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

  const handleMenuClick = event => {
    const item = event.target.closest('[data-subtitle-track]');
    if (!item) return;
    stopPlayerMenuClick(event);
    applySelection(item.dataset.subtitleTrack);
    close();
  };

  const handleButtonClick = event => {
    stopPlayerMenuClick(event);
    toggle();
  };

  const handleCloseRequest = event => {
    if (shouldCloseForMenuRequest(event, menu)) close();
  };

  const handleDocumentClick = event => {
    if (!isOpen) return;
    if (!menu.contains(event.target) && !button.contains(event.target)) {
      close();
    }
  };

  button.addEventListener('click', handleButtonClick);
  button.addEventListener('pointerdown', stopPlayerMenuPointerEvent);
  menu.addEventListener('click', handleMenuClick);
  menu.addEventListener('pointerdown', stopPlayerMenuPointerEvent);
  menu.addEventListener('keydown', handleKeyDown);
  document.addEventListener(CLOSE_PLAYER_MENUS_EVENT, handleCloseRequest);
  document.addEventListener('click', handleDocumentClick);

  return {
    button,
    update,
    open,
    close,
    destroy: () => {
      close();
      removeRegisteredTracks();
      button.removeEventListener('click', handleButtonClick);
      button.removeEventListener('pointerdown', stopPlayerMenuPointerEvent);
      menu.removeEventListener('click', handleMenuClick);
      menu.removeEventListener('pointerdown', stopPlayerMenuPointerEvent);
      menu.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener(CLOSE_PLAYER_MENUS_EVENT, handleCloseRequest);
      document.removeEventListener('click', handleDocumentClick);
      button.remove();
      menu.remove();
    }
  };
}
