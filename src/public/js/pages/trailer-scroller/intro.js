import { createElement } from '../../utils/dom.js';
import { markIntroAsSeen } from '../trailer-scroller.state.js';

export function createIntroModal({ onStart }) {
  const title = createElement('h2', { className: 'trailer-intro-title' }, 'Willkommen beim Scroller');
  const text = createElement('p', { className: 'trailer-intro-text' },
    'Entdecke Trailer aus deiner Jellyfin-Bibliothek. Scrolle vertikal durch die Clips, tippe auf das Herz, um Filme und Serien als Favoriten zu markieren, oder öffne die Detailseite für mehr Infos.'
  );

  const startButton = createElement('button', {
    className: 'btn-primary trailer-intro-button',
    type: 'button'
  }, 'Starten');

  const modalContent = createElement('div', {
    className: 'trailer-intro-content',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'trailer-intro-title'
  }, title, text, startButton);

  const backdrop = createElement('div', {
    className: 'trailer-intro-backdrop'
  }, modalContent);

  const close = () => {
    markIntroAsSeen();
    backdrop.remove();
    if (onStart) onStart();
  };

  startButton.addEventListener('click', close);

  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });

  const onKeydown = (event) => {
    if (event.key === 'Escape') {
      close();
      window.removeEventListener('keydown', onKeydown);
    }
  };
  window.addEventListener('keydown', onKeydown);

  return { element: backdrop, close };
}
