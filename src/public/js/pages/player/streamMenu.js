import { createElement } from '../../utils/dom.js';
import { PLAYBACK_MODES } from '../../store/settings.store.js';
import { checkIcon } from './playerIcons.js';

const STREAM_METHOD_OPTIONS = [
  {
    value: PLAYBACK_MODES.TRANSCODE,
    label: 'Immer transkodieren',
    platform: 'iOS',
    recommended: true,
    description: 'Jellyfin wandelt Video und Audio in ein kompatibles Format um. Beste Wahl für iPhone und iPad.'
  },
  {
    value: PLAYBACK_MODES.DIRECT,
    label: 'Direktstream',
    platform: 'Android',
    recommended: true,
    description: 'Nutzt den originalen Stream, wenn Android ihn abspielen kann. Spart Serverleistung und startet oft schneller.'
  },
  {
    value: PLAYBACK_MODES.COMPATIBLE,
    label: 'Automatisch',
    platform: null,
    recommended: false,
    description: 'Die App entscheidet anhand von Browser und Medienformat zwischen Direktstream und Transcoding.'
  }
];

export const getStreamMethodOption = (mode) =>
  STREAM_METHOD_OPTIONS.find(option => option.value === mode) || STREAM_METHOD_OPTIONS[0];

export function createStreamMenu({
  streamMenuButton,
  streamMenuButtonLabel,
  streamMenu,
  streamMenuWrapper,
  streamMenuItems,
  getActiveMode,
  onSelect
}) {
  let streamMenuOpen = false;
  let streamMenuCloseTimeout = null;

  streamMenu.appendChild(
    createElement('div', { className: 'player-stream-menu-header' },
      createElement('div', { className: 'player-stream-menu-title' }, 'Stream-Methode'),
      createElement('div', { className: 'player-stream-menu-copy' },
        'Ändert, ob Jellyfin direkt streamt oder das Video in ein kompatibles Format umwandelt.'
      )
    )
  );

  STREAM_METHOD_OPTIONS.forEach(option => {
    const check = createElement('span', { className: 'player-stream-option-check' });
    check.innerHTML = checkIcon;

    const item = createElement('button', {
      className: 'player-stream-option',
      type: 'button',
      role: 'menuitemradio',
      'aria-checked': 'false',
      onClick: async (event) => {
        event.stopPropagation();
        await onSelect(option.value);
      }
    },
      createElement('span', { className: 'player-stream-option-main' },
        createElement('span', { className: 'player-stream-option-title' },
          option.label,
          option.platform ? createElement('span', { className: 'player-stream-option-platform' }, `(${option.platform})`) : null,
          option.recommended ? createElement('span', { className: 'player-stream-recommend' }, 'Recommend') : null
        ),
        createElement('span', { className: 'player-stream-option-description' }, option.description)
      ),
      check
    );

    streamMenuItems.push({ item, check, value: option.value });
    streamMenu.appendChild(item);
  });

  const isHoverStreamMenu = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const updateStreamMenuState = () => {
    const currentMode = getActiveMode();
    const currentOption = getStreamMethodOption(currentMode);
    streamMenuButtonLabel.textContent = currentOption.platform
      ? `${currentOption.label} (${currentOption.platform})`
      : currentOption.label;

    streamMenuItems.forEach(({ item, value }) => {
      const active = value === currentMode;
      item.classList.toggle('active', active);
      item.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  };

  const setStreamMenuOpen = (open) => {
    if (streamMenuOpen === open) return;
    streamMenuOpen = open;
    streamMenu.hidden = !open;
    streamMenuWrapper.classList.toggle('open', open);
    streamMenuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  const closeStreamMenuSoon = () => {
    if (streamMenuCloseTimeout) clearTimeout(streamMenuCloseTimeout);
    streamMenuCloseTimeout = setTimeout(() => setStreamMenuOpen(false), 140);
  };

  streamMenuWrapper.addEventListener('mouseenter', () => {
    if (!isHoverStreamMenu()) return;
    if (streamMenuCloseTimeout) clearTimeout(streamMenuCloseTimeout);
    setStreamMenuOpen(true);
  });

  streamMenuWrapper.addEventListener('mouseleave', () => {
    if (!isHoverStreamMenu()) return;
    closeStreamMenuSoon();
  });

  streamMenuButton.addEventListener('click', (event) => {
    event.stopPropagation();
    setStreamMenuOpen(!streamMenuOpen);
  });

  streamMenuButton.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setStreamMenuOpen(!streamMenuOpen);
    }
    if (event.key === 'Escape') setStreamMenuOpen(false);
  });

  streamMenu.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  return {
    updateStreamMenuState,
    setStreamMenuOpen,
    closeStreamMenuSoon,
    cleanup: () => {
      if (streamMenuCloseTimeout) clearTimeout(streamMenuCloseTimeout);
    }
  };
}
