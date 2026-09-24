import { createElement } from '../../../utils/dom.js';
import { icon } from './icons.js';

const COPIED_FEEDBACK_MS = 2_000;

// Share row under the roster: the party link, copy with a short confirmation,
// and (for the host) inviting a user by name.
export function createInviteBar(ctx) {
  const input = createElement('input', {
    className: 'watch-party-invite-input',
    type: 'text',
    readonly: true,
    'aria-label': 'Einladungslink'
  });
  const copyLabel = createElement('span', {}, 'Link kopieren');
  const copyButton = createElement('button', {
    className: 'watch-party-invite-copy',
    type: 'button',
    onClick: () => ctx.handleCopyInvite()
  }, icon('link'), copyLabel);
  const userButton = createElement('button', {
    className: 'watch-party-invite-user',
    type: 'button',
    hidden: true,
    onClick: () => ctx.openInviteUserMenu()
  }, icon('userPlus'), createElement('span', {}, 'Nutzer einladen'));

  const element = createElement('div', { className: 'watch-party-invite' },
    createElement('div', { className: 'watch-party-invite-link' }, input),
    createElement('div', { className: 'watch-party-invite-actions' }, copyButton, userButton)
  );

  let resetTimer = null;
  const showCopied = () => {
    copyButton.classList.add('is-copied');
    copyLabel.textContent = 'Kopiert';
    copyButton.replaceChild(icon('check'), copyButton.firstChild);
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      copyButton.classList.remove('is-copied');
      copyLabel.textContent = 'Link kopieren';
      copyButton.replaceChild(icon('link'), copyButton.firstChild);
    }, COPIED_FEEDBACK_MS);
  };

  return {
    element,
    input,
    userButton,
    showCopied,
    destroy: () => window.clearTimeout(resetTimer)
  };
}
