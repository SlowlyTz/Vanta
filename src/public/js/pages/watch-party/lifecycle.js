export function bindLifecycle(ctx) {
  ctx.goHome = () => {
    ctx.cleanup();
    window.location.hash = '#/home';
  };

  ctx.cleanup = () => {
    if (ctx.destroyed) return;
    ctx.destroyed = true;
    window.removeEventListener('hashchange', ctx.handleHashChange);
    ctx.stopOwnerHeartbeat();
    ctx.drift.stop();
    ctx.cancelSyncedStart();
    ctx.resetPreload();
    ctx.hideCountdown();
    ctx.topbar.destroy();
    ctx.inviteBar.destroy();
    if (ctx.inviteResolveTimer) window.clearTimeout(ctx.inviteResolveTimer);
    ctx.clock.stop();
    ctx.socket?.close();
    try {
      ctx.controller?.destroy();
    } catch (error) {
      console.warn('[Watch Party Cleanup]', error);
    }
    ctx.unlockPlayerViewport();
  };

  ctx.handleHashChange = () => {
    if (!window.location.hash.startsWith(`#/watch-party/${ctx.partyId}`)) ctx.cleanup();
  };

  ctx.lockPlayerViewport = () => {
    ctx.scrollLockY = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.classList.add('player-active');
    document.body.classList.add('player-active');
  };

  ctx.unlockPlayerViewport = () => {
    document.documentElement.classList.remove('player-active');
    document.body.classList.remove('player-active');
    window.scrollTo(0, ctx.scrollLockY);
  };

  ctx.setSyncStatus = (status, label) => {
    ctx.syncStatusBadge.dataset.status = status;
    ctx.syncStatusBadge.textContent = label;
  };

  return ctx;
}
