import { createElement } from '../utils/dom.js';
import { YouTubePlayerManager } from '../pages/trailer-scroller/player.js';
import { openModal } from '../utils/modal.js';

let trailerModalCounter = 0;

export function extractYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host === 'youtu.be' || host === 'www.youtu.be') {
      return parsed.pathname.slice(1).split('/')[0] || null;
    }

    if (
      host === 'youtube.com' ||
      host === 'www.youtube.com' ||
      host === 'youtube-nocookie.com' ||
      host === 'www.youtube-nocookie.com'
    ) {
      const v = parsed.searchParams.get('v');
      if (v) return v;

      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts[0] === 'embed' || pathParts[0] === 'shorts') {
        return pathParts[1] || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function openTrailerModal({ title, videoId }) {
  const modalId = `trailer-player-${++trailerModalCounter}`;
  const playerManager = new YouTubePlayerManager();

  const playerTarget = createElement('div', {
    className: 'detail-trailer-player',
    id: modalId
  });

  const closeButton = createElement('button', {
    className: 'detail-trailer-close',
    type: 'button',
    'aria-label': 'Trailer schließen',
    onClick: () => modal.close()
  }, '×');

  const dialog = createElement('div', {
    className: 'detail-trailer-modal',
    'aria-labelledby': 'detail-trailer-title'
  },
    closeButton,
    createElement('h2', { className: 'detail-trailer-title', id: 'detail-trailer-title' }, title),
    createElement('div', { className: 'detail-trailer-frame' }, playerTarget)
  );

  const overlay = createElement('div', { className: 'detail-trailer-backdrop' }, dialog);

  const modal = openModal({
    overlay,
    dialog,
    initialFocus: closeButton,
    onClose: () => playerManager.destroyAll()
  });

  playerManager.createPlayer(modalId, videoId, {
    autoplay: 1,
    muted: false
  });

  return modal;
}
