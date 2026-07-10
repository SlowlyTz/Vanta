import { createElement } from '../utils/dom.js';
import { YouTubePlayerManager } from '../pages/trailer-scroller/player.js';

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

  const closeModal = () => {
    playerManager.destroyAll();
    modal.remove();
    document.removeEventListener('keydown', handleKeydown);
  };

  const handleKeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeModal();
    }
  };

  const modal = createElement('div', {
    className: 'detail-trailer-backdrop',
    onClick: (event) => {
      if (event.target === modal) closeModal();
    }
  },
    createElement('div', {
      className: 'detail-trailer-modal',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'detail-trailer-title'
    },
      createElement('button', {
        className: 'detail-trailer-close',
        type: 'button',
        'aria-label': 'Trailer schließen',
        onClick: closeModal
      }, '×'),
      createElement('h2', { className: 'detail-trailer-title', id: 'detail-trailer-title' }, title),
      createElement('div', { className: 'detail-trailer-frame' }, playerTarget)
    )
  );

  document.body.appendChild(modal);
  document.addEventListener('keydown', handleKeydown);

  playerManager.createPlayer(modalId, videoId, {
    autoplay: 1,
    muted: false
  });
}
