import { createElement } from '../../utils/dom.js';
import { markIntroAsSeen } from '../trailer-scroller.state.js';

export function createIntroModal({ onStart }) {
  const title = createElement('h2', { className: 'trailer-intro-title', id: 'trailer-intro-title' }, 'Dein Trailer-Feed');
  const text = createElement('p', { className: 'trailer-intro-text' },
    'Entdecke Filme und Serien aus deiner Mediathek in einem ruhigen, vertikalen Feed.'
  );

  const features = createElement('ul', { className: 'trailer-intro-features' },
    createElement('li', {},
      createElement('span', { className: 'trailer-intro-feature-number' }, '01'),
      createElement('span', {},
        createElement('strong', {}, 'Scrollen oder wischen'),
        createElement('small', {}, 'Wechsle vertikal zwischen den Trailern.')
      )
    ),
    createElement('li', {},
      createElement('span', { className: 'trailer-intro-feature-number' }, '02'),
      createElement('span', {},
        createElement('strong', {}, 'YouTube bedienen'),
        createElement('small', {}, 'Wiedergabe, Ton und Vollbild bleiben im originalen Player.')
      )
    ),
    createElement('li', {},
      createElement('span', { className: 'trailer-intro-feature-number' }, '03'),
      createElement('span', {},
        createElement('strong', {}, 'Merken oder weitersehen'),
        createElement('small', {}, 'Speichere Favoriten oder öffne direkt die Detailseite.')
      )
    )
  );

  const startButton = createElement('button', {
    className: 'btn-primary trailer-intro-button',
    type: 'button'
  }, 'Scroller öffnen');

  const modalContent = createElement('div', {
    className: 'trailer-intro-content',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'trailer-intro-title'
  },
    createElement('span', { className: 'trailer-intro-eyebrow' }, 'VANTA SCROLLER'),
    title,
    text,
    features,
    startButton
  );

  const backdrop = createElement('div', {
    className: 'trailer-intro-backdrop'
  }, modalContent);

  const close = () => {
    markIntroAsSeen();
    window.removeEventListener('keydown', onKeydown);
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
    }
  };
  window.addEventListener('keydown', onKeydown);

  return { element: backdrop, close };
}
