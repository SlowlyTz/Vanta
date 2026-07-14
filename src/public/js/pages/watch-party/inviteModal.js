import { createElement } from '../../utils/dom.js';
import { WatchPartyApi } from '../../api/watch-party.api.js';
import { appStore } from '../../store/app.store.js';

export function bindInviteModal(ctx) {
  ctx.openInviteUserMenu = () => {
    ctx.inviteUserOverlay.hidden = false;
    ctx.inviteUsernameInput.value = '';
    ctx.inviteResult.innerHTML = '';
    ctx.inviteStatus.textContent = '';
    ctx.inviteStatus.classList.remove('is-error');
    ctx.selectedInviteUser = null;
    ctx.sendingInvitation = false;
    ctx.renderInviteSelection();
    ctx.inviteUserOverlay.setAttribute('tabindex', '-1');
    ctx.inviteUserOverlay.focus();
    ctx.inviteUsernameInput.focus();
  };

  ctx.closeInviteUserMenu = () => {
    ctx.inviteUserOverlay.hidden = true;
    if (ctx.inviteResolveTimer) window.clearTimeout(ctx.inviteResolveTimer);
  };

  ctx.handleInviteUsernameInput = () => {
    if (ctx.inviteResolveTimer) window.clearTimeout(ctx.inviteResolveTimer);
    ctx.inviteResolveTimer = window.setTimeout(() => ctx.resolveInviteUsername(), 250);
  };

  ctx.resolveInviteUsername = async () => {
    const username = ctx.inviteUsernameInput.value.trim();
    ctx.inviteResult.innerHTML = '';
    ctx.inviteStatus.textContent = '';
    ctx.inviteStatus.classList.remove('is-error');
    ctx.selectedInviteUser = null;
    ctx.renderInviteSelection();

    if (!username) return;

    try {
      const { user } = await WatchPartyApi.resolveInviteUser(ctx.partyId, username);
      if (!user) {
        ctx.inviteResult.textContent = 'Kein exakter Treffer';
        ctx.inviteResult.dataset.state = 'empty';
        return;
      }

      ctx.selectedInviteUser = user;
      ctx.inviteResult.dataset.state = 'found';
      ctx.inviteResult.appendChild(createElement('div', { className: 'watch-party-invite-result-row' },
        createElement('span', { className: 'watch-party-invite-result-name' }, user.username),
        createElement('span', { className: 'watch-party-invite-result-meta' }, 'Gefunden')
      ));
      ctx.renderInviteSelection();
    } catch {
      ctx.inviteResult.textContent = 'Suche fehlgeschlagen';
      ctx.inviteResult.dataset.state = 'error';
    }
  };

  ctx.renderInviteSelection = () => {
    ctx.inviteSendButton.disabled = !ctx.selectedInviteUser || ctx.sendingInvitation;
    ctx.inviteSendButton.textContent = ctx.sendingInvitation ? 'Sendet …' : 'Einladung senden';
  };

  ctx.sendSelectedInvitation = async () => {
    if (!ctx.selectedInviteUser || ctx.sendingInvitation) return;
    ctx.sendingInvitation = true;
    ctx.renderInviteSelection();

    try {
      const invitedUsername = ctx.selectedInviteUser.username;
      await WatchPartyApi.sendInvitation(ctx.partyId, invitedUsername);
      ctx.closeInviteUserMenu();
      appStore.showToast(`Einladung an ${invitedUsername} gesendet.`, 'success');
    } catch (error) {
      ctx.inviteStatus.textContent = error.message || 'Einladung konnte nicht gesendet werden.';
      ctx.inviteStatus.classList.add('is-error');
      ctx.sendingInvitation = false;
      ctx.renderInviteSelection();
    }
  };

  return ctx;
}
