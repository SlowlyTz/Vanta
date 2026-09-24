import { createElement } from '../../../utils/dom.js';
import { icon } from './icons.js';

const CONFIRM_TIMEOUT_MS = 4_000;

export function createTopbar(ctx) {
  const backButton = createElement('button', {
    className: 'watch-party-back',
    type: 'button',
    'aria-label': 'Zurück',
    onClick: () => ctx.goHome()
  }, icon('back'), createElement('span', {}, 'Zurück'));

  const endButton = createElement('button', {
    className: 'watch-party-end-button',
    type: 'button',
    role: 'menuitem'
  }, 'Party beenden');
  const menu = createElement('div', { className: 'watch-party-owner-menu', role: 'menu', hidden: true }, endButton);
  const menuButton = createElement('button', {
    className: 'watch-party-owner-menu-button',
    type: 'button',
    hidden: true,
    'aria-label': 'Party-Optionen',
    'aria-haspopup': 'menu',
    'aria-expanded': 'false'
  }, icon('more'));

  const element = createElement('header', { className: 'watch-party-topbar' },
    backButton,
    createElement('div', { className: 'watch-party-topbar-title' },
      createElement('span', { className: 'watch-party-live-dot', 'aria-hidden': 'true' }),
      'Watch Party'
    ),
    createElement('div', { className: 'watch-party-owner-menu-anchor' }, menuButton, menu)
  );

  let confirmTimer = null;
  const resetConfirm = () => {
    window.clearTimeout(confirmTimer);
    endButton.classList.remove('is-confirming');
    endButton.textContent = 'Party beenden';
  };
  const closeMenu = () => {
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    resetConfirm();
  };
  const openMenu = () => {
    menu.hidden = false;
    menuButton.setAttribute('aria-expanded', 'true');
    endButton.focus();
  };

  menuButton.addEventListener('click', event => {
    event.stopPropagation();
    if (menu.hidden) openMenu();
    else closeMenu();
  });
  // Ending is final for everyone, so it takes a second, deliberate click.
  endButton.addEventListener('click', event => {
    event.stopPropagation();
    if (!endButton.classList.contains('is-confirming')) {
      endButton.classList.add('is-confirming');
      endButton.textContent = 'Wirklich für alle beenden?';
      confirmTimer = window.setTimeout(resetConfirm, CONFIRM_TIMEOUT_MS);
      return;
    }
    closeMenu();
    ctx.handleEnd();
  });
  const handleDocumentClick = event => {
    if (!menu.hidden && !menu.contains(event.target)) closeMenu();
  };
  const handleKeydown = event => {
    if (event.key === 'Escape' && !menu.hidden) {
      closeMenu();
      menuButton.focus();
    }
  };
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('keydown', handleKeydown);

  return {
    element,
    backButton,
    endButton,
    menuButton,
    closeMenu,
    setOwnerControls: visible => {
      menuButton.hidden = !visible;
      if (!visible) closeMenu();
    },
    destroy: () => {
      window.clearTimeout(confirmTimer);
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeydown);
    }
  };
}
