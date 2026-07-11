import {
  CLOSE_PLAYER_MENUS_EVENT,
  requestClosePlayerMenus,
  shouldCloseForMenuRequest,
  stopPlayerMenuClick,
  stopPlayerMenuPointerEvent
} from './menuEvents.js';

const EPISODES_ICON = '<path d="M4 4h16v4H4V4zm0 6h10v4H4v-4zm0 6h16v4H4v-4z"/>';

function svgIcon(path) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatEpisodeCode(episode) {
  const season = String(episode.ParentIndexNumber || 1).padStart(2, '0');
  const index = String(episode.IndexNumber || 1).padStart(2, '0');
  return `S${season}E${index}`;
}

export function findEpisode(context, episodeId) {
  for (const episodes of Object.values(context?.episodesBySeason || {})) {
    const match = episodes.find(episode => episode.Id === episodeId);
    if (match) return match;
  }
  return null;
}

export function createEpisodeBrowser({ buttonContainer, menuContainer = buttonContainer, context, readonly = false, onSelectEpisode }) {
  let isOpen = false;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'vanta-player-menu-button vanta-player-episodes-button';
  button.setAttribute('aria-label', 'Folgen anzeigen');
  button.setAttribute('aria-haspopup', 'true');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = svgIcon(EPISODES_ICON);

  const menu = document.createElement('div');
  menu.className = 'vanta-player-menu vanta-player-episodes-panel';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Folgen');
  menu.hidden = true;

  buttonContainer.insertBefore(button, buttonContainer.firstChild);
  menuContainer.appendChild(menu);

  function render() {
    const seasons = context?.seasons || [];

    menu.innerHTML = seasons.map(season => `
      <section class="vanta-player-episode-season">
        <h3>${escapeHtml(season.Name || `Staffel ${season.IndexNumber ?? ''}`)}</h3>
        ${(context.episodesBySeason?.[season.Id] || []).map(episode => `
          <button
            type="button"
            class="vanta-player-episode-row${episode.Id === context.currentEpisodeId ? ' is-current' : ''}"
            role="menuitem"
            data-episode-id="${escapeHtml(episode.Id)}"
            tabindex="-1"
            ${readonly ? 'disabled aria-disabled="true"' : ''}
          >
            <span class="vanta-player-episode-row-code">${formatEpisodeCode(episode)}</span>
            <strong class="vanta-player-episode-row-title">${escapeHtml(episode.Name || 'Unbenannte Folge')}</strong>
          </button>
        `).join('')}
      </section>
    `).join('');
  }

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };

  const open = () => {
    if (isOpen) return;
    requestClosePlayerMenus(menu);
    isOpen = true;
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
  };

  const toggle = () => {
    if (isOpen) close();
    else open();
  };

  const handleButtonClick = event => {
    stopPlayerMenuClick(event);
    toggle();
  };

  const handleMenuClick = event => {
    const row = event.target.closest('[data-episode-id]');
    if (!row || readonly) return;
    stopPlayerMenuClick(event);
    const episode = findEpisode(context, row.dataset.episodeId);
    if (episode) onSelectEpisode?.(episode);
    close();
  };

  const handleCloseRequest = event => {
    if (shouldCloseForMenuRequest(event, menu)) close();
  };

  button.addEventListener('click', handleButtonClick);
  button.addEventListener('pointerdown', stopPlayerMenuPointerEvent);
  menu.addEventListener('click', handleMenuClick);
  menu.addEventListener('pointerdown', stopPlayerMenuPointerEvent);
  document.addEventListener(CLOSE_PLAYER_MENUS_EVENT, handleCloseRequest);

  const handleDocumentClick = event => {
    if (!isOpen) return;
    if (!menu.contains(event.target) && !button.contains(event.target)) close();
  };
  document.addEventListener('click', handleDocumentClick);

  render();

  return {
    button,
    update(nextContext) {
      context = nextContext;
      render();
    },
    open,
    close,
    destroy: () => {
      close();
      button.removeEventListener('click', handleButtonClick);
      button.removeEventListener('pointerdown', stopPlayerMenuPointerEvent);
      menu.removeEventListener('click', handleMenuClick);
      menu.removeEventListener('pointerdown', stopPlayerMenuPointerEvent);
      document.removeEventListener(CLOSE_PLAYER_MENUS_EVENT, handleCloseRequest);
      document.removeEventListener('click', handleDocumentClick);
      button.remove();
      menu.remove();
    }
  };
}
