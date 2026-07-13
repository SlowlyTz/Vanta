import { createElement } from '../../utils/dom.js';
import { watchPartyInvitationStore } from '../../store/watch-party-invitations.store.js';
import { WatchPartyApi } from '../../api/watch-party.api.js';
import { appStore } from '../../store/app.store.js';

export function mountWatchPartyInvitationOverlay() {
  const root = createElement('div', { className: 'watch-party-invitation-stack' });
  document.body.appendChild(root);

  const unsubscribe = watchPartyInvitationStore.subscribe(({ invitations }) => {
    root.innerHTML = '';
    invitations.forEach(invitation => {
      root.appendChild(createInvitationCard(invitation));
    });
  });

  return () => {
    unsubscribe();
    root.remove();
  };
}

function createInvitationCard(invitation) {
  let deciding = false;

  const acceptButton = createElement('button', {
    type: 'button',
    className: 'watch-party-invitation-accept',
    onClick: () => decide('accept')
  }, 'Annehmen');

  const declineButton = createElement('button', {
    type: 'button',
    className: 'watch-party-invitation-decline',
    onClick: () => decide('decline')
  }, 'Ablehnen');

  async function decide(action) {
    if (deciding) return;
    deciding = true;
    acceptButton.disabled = true;
    declineButton.disabled = true;

    try {
      const result = action === 'accept'
        ? await WatchPartyApi.acceptInvitation(invitation.id)
        : await WatchPartyApi.declineInvitation(invitation.id);

      watchPartyInvitationStore.remove(invitation.id);
      if (action === 'accept' && result.navigateTo) {
        window.location.hash = result.navigateTo;
      }
    } catch (error) {
      appStore.showToast(error.message || 'Einladung konnte nicht bearbeitet werden', 'error');
      deciding = false;
      acceptButton.disabled = false;
      declineButton.disabled = false;
    }
  }

  return createElement('div', { className: 'watch-party-invitation-card' },
    createElement('div', { className: 'watch-party-invitation-title' }, 'Watch Party Einladung'),
    createElement('p', { className: 'watch-party-invitation-text' },
      `${invitation.inviterUsername} lädt dich zu "${invitation.itemName}" ein.`),
    createElement('div', { className: 'watch-party-invitation-actions' }, acceptButton, declineButton)
  );
}
