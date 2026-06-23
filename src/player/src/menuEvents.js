export const CLOSE_PLAYER_MENUS_EVENT = 'vanta-player-close-menus';

export function requestClosePlayerMenus(source) {
  if (typeof document === 'undefined' || typeof CustomEvent !== 'function') return;
  document.dispatchEvent(new CustomEvent(CLOSE_PLAYER_MENUS_EVENT, {
    detail: { source }
  }));
}

export function shouldCloseForMenuRequest(event, source) {
  return event?.detail?.source !== source;
}

export function stopPlayerMenuClick(event) {
  event.preventDefault();
  event.stopPropagation();
}

export function stopPlayerMenuPointerEvent(event) {
  event.stopPropagation();
}
