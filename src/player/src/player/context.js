import { isIOSLike, isPictureInPictureSupported, enforceInlineVideoPlayback } from '../platform.js';
import { createPlayerUi } from '../ui/playerUi.js';
import { applyWatchPartyPermissions } from '../watchParty.js';
import { createPlayerMarkup } from './markup.js';

export async function createPlayerContext(options) {
  const {
    root,
    itemId,
    title,
    poster,
    resumePosition = 0,
    resolvePlayback,
    reportPlayback,
    onBack,
    watchParty = null,
    episodeBrowser = null,
    deferInitialLoad = false
  } = options;

  await customElements.whenDefined('media-player');

  const iosLike = isIOSLike();
  const dom = createPlayerMarkup(root, { title, poster });
  const { player } = dom;
  if (iosLike) {
    const iosKeyShortcuts = { ...player.keyShortcuts };
    delete iosKeyShortcuts.toggleFullscreen;
    player.keyShortcuts = iosKeyShortcuts;
  }

  const context = {
    root,
    itemId,
    title,
    poster,
    resumePosition,
    resolvePlayback,
    reportPlayback,
    onBack,
    watchParty,
    episodeBrowser,
    deferInitialLoad,
    iosLike,
    dom,
    player,
    disposers: [],
    ui: createPlayerUi(root),
    destroyed: false,
    fallbackAttempted: false,
    knownDuration: 0,
    lastWheelSeekAt: 0,
    ownerEchoSuppressionDepth: 0
  };

  context.listen = (target, event, handler, listenerOptions) => {
    target.addEventListener(event, handler, listenerOptions);
    context.disposers.push(() => target.removeEventListener(event, handler, listenerOptions));
  };

  context.beginOwnerEchoSuppression = () => {
    context.ownerEchoSuppressionDepth += 1;
  };
  context.endOwnerEchoSuppression = (delay = 250) => {
    window.setTimeout(() => {
      context.ownerEchoSuppressionDepth = Math.max(0, context.ownerEchoSuppressionDepth - 1);
    }, delay);
  };

  context.watchPartyPhase = () => watchParty?.phase || watchParty?.mode || (watchParty?.enabled ? 'playback' : null);
  context.isDeferredReadyRoom = () => context.watchPartyPhase() === 'ready-room';
  context.canControlWatchParty = () => {
    if (!watchParty?.enabled) return true;
    return Boolean(watchParty.canControl ?? watchParty.isOwner);
  };
  context.canEmitOwnerControl = () => (
    watchParty?.enabled && context.canControlWatchParty() && context.watchPartyPhase() === 'playback'
      && context.ownerEchoSuppressionDepth === 0
  );

  const fullKeyShortcuts = { ...player.keyShortcuts };
  const viewerKeyShortcuts = iosLike
    ? { toggleMuted: 'm' }
    : { toggleMuted: 'm', toggleFullscreen: 'f' };

  context.refreshWatchPartyControlAccess = () => {
    if (!watchParty?.enabled) return;
    player.keyShortcuts = context.canControlWatchParty() ? fullKeyShortcuts : viewerKeyShortcuts;
    applyWatchPartyPermissions({ root, watchParty });
  };
  context.forcePlaybackPhase = () => {
    if (!watchParty?.enabled) return;
    watchParty.phase = 'playback';
    watchParty.mode = 'playback';
  };

  if (watchParty?.enabled) {
    watchParty.onParticipantsChange = context.refreshWatchPartyControlAccess;
  }
  context.refreshWatchPartyControlAccess();

  context.syncInlinePlayback = () => {
    if (!iosLike) return;
    enforceInlineVideoPlayback(root);
  };

  if (iosLike) {
    root.classList.add('is-ios', 'supports-ios-inline-fullscreen');
    context.syncInlinePlayback();
  }
  if (!isPictureInPictureSupported()) root.classList.add('no-pip');

  return context;
}
