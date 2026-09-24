import { createElement } from '../../../utils/dom.js';

// Sticky bar at the bottom of the lobby: one line of context and the one
// action that matters right now (start for the host, Ready for everyone).
export function createActionBar(ctx) {
  const title = createElement('strong', { className: 'watch-party-action-title' });
  const hint = createElement('span', { className: 'watch-party-start-hint' });
  const status = createElement('span', { className: 'watch-party-ready-status', 'aria-live': 'polite' });
  const startButton = createElement('button', {
    className: 'watch-party-start-button',
    type: 'button',
    hidden: true,
    onClick: () => ctx.handleStart()
  }, 'Party starten');
  const readyButton = createElement('button', {
    className: 'watch-party-ready-button',
    type: 'button',
    hidden: true,
    onClick: () => ctx.handleReadyClick()
  }, 'Bereit');
  const waitingDots = createElement('span', { className: 'watch-party-waiting-dots', 'aria-hidden': 'true' },
    createElement('i'), createElement('i'), createElement('i')
  );

  const element = createElement('footer', { className: 'watch-party-action-bar' },
    createElement('div', { className: 'watch-party-action-bar-inner' },
      createElement('div', { className: 'watch-party-action-text' }, title, hint, status),
      createElement('div', { className: 'watch-party-action-buttons' }, waitingDots, startButton, readyButton)
    )
  );

  return { element, title, hint, status, startButton, readyButton, waitingDots };
}
