import { WatchPartyApi } from '../../api/watch-party.api.js';
import { appStore } from '../../store/app.store.js';

export function bindActions(ctx) {
  ctx.handleKick = async userId => {
    try {
      await WatchPartyApi.kick(ctx.partyId, userId);
    } catch (error) {
      appStore.showToast(error.message || 'Mitglied konnte nicht entfernt werden', 'error');
    }
  };

  ctx.handleStart = () => {
    if (!ctx.isOwner() || ctx.party?.status !== 'lobby') return;
    ctx.socket?.sendJson({ type: 'OWNER_OPEN_READY_ROOM' });
  };

  ctx.handleEnd = async () => {
    if (ctx.ending) return;
    ctx.ending = true;
    try {
      const positionMs = ctx.controller?.player
        ? Math.round(ctx.controller.player.currentTime * 1000)
        : ctx.party?.positionMs || 0;
      await WatchPartyApi.end(ctx.partyId, positionMs);
    } catch (error) {
      appStore.showToast(error.message || 'Watch Party konnte nicht beendet werden', 'error');
    } finally {
      ctx.ending = false;
    }
  };

  ctx.handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(ctx.inviteInput.value);
      appStore.showToast('Link kopiert', 'success');
    } catch {
      ctx.inviteInput.select();
    }
  };

  return ctx;
}
