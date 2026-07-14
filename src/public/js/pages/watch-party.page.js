import { createWatchPartyContext } from './watch-party/context.js';
import { bindLifecycle } from './watch-party/lifecycle.js';
import { bindRendering } from './watch-party/rendering.js';
import { bindReadyRoom } from './watch-party/readyRoom.js';
import { bindActions } from './watch-party/actions.js';
import { bindInviteModal } from './watch-party/inviteModal.js';
import { bindCountdown } from './watch-party/countdown.js';
import { bindNotifications } from './watch-party/notifications.js';
import { bindPlayerMount } from './watch-party/playerMount.js';
import { bindSync } from './watch-party/sync.js';
import { bindSocketHandlers } from './watch-party/socketHandlers.js';

export default function WatchPartyPage({ partyId }) {
  const ctx = createWatchPartyContext({ partyId });

  bindLifecycle(ctx);
  bindRendering(ctx);
  bindReadyRoom(ctx);
  bindActions(ctx);
  bindInviteModal(ctx);
  bindCountdown(ctx);
  bindNotifications(ctx);
  bindPlayerMount(ctx);
  bindSync(ctx);
  bindSocketHandlers(ctx);

  window.addEventListener('hashchange', ctx.handleHashChange);
  ctx.init();

  return ctx.container;
}
