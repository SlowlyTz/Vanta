import { isIOSLike, isPictureInPictureSupported, enforceInlineVideoPlayback } from '../platform.js';
import { createPlayerUi } from '../ui/playerUi.js';
import { applyWatchPartyPermissions } from '../watchParty.js';
import { createEchoTokens } from '../syncEcho.js';
import { createPlayerMarkup } from './markup.js';

export async function createPlayerContext(options) {
  const {
    root,
    itemId,
    title,
    subtitle = '',
    poster,
    resumePosition = 0,
    resolvePlayback,
    reportPlayback,
    onBack,
    watchParty = null,
    episodeBrowser = null,
    preferences = null,
    loadSegments = null,
    deferInitialLoad = false
  } = options;

  await customElements.whenDefined('media-player');

  const iosLike = isIOSLike();
  const dom = createPlayerMarkup(root, { title, subtitle, poster });
  const { player } = dom;

  const context = {
    root,
    itemId,
    title,
    subtitle,
    poster,
    resumePosition,
    // Every stream request keeps the chosen audio track and quality, so a
    // quality change or the HLS fallback does not drop back to the default
    // track; before the first choice the remembered audio language is sent.
    resolvePlayback: (mode, requestOptions = {}) => resolvePlayback(mode, {
      ...context.streamSelection(),
      ...requestOptions
    }),
    reportPlayback,
    onBack,
    watchParty,
    episodeBrowser,
    preferencesConfig: preferences,
    loadSegments,
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
    ownerEchoSuppressionDepth: 0,
    echoTokens: createEchoTokens()
  };

  context.streamSelection = () => {
    const selection = {};
    const audioIndex = context.audioMenu?.getCurrentIndex?.();
    if (Number.isInteger(audioIndex) && context.sourceSwitch?.getCurrentPlayback?.()) selection.audioStreamIndex = audioIndex;
    else if (context.preferences?.get().audioLanguage) selection.audioLanguage = context.preferences.get().audioLanguage;
    const quality = context.qualityMenu?.getCurrentId?.();
    if (quality && quality !== 'auto') selection.qualityProfile = quality;
    return selection;
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
  // `kind` is the media event (play, pause, seek). A pending echo token for it
  // means the sync itself caused the event, so it is consumed, not reported.
  context.canEmitOwnerControl = kind => {
    if (kind && context.echoTokens.consume(kind)) return false;
    return Boolean(watchParty?.enabled) && context.canControlWatchParty()
      && context.watchPartyPhase() === 'playback'
      && context.ownerEchoSuppressionDepth === 0;
  };

  context.refreshWatchPartyControlAccess = () => {
    if (!watchParty?.enabled) return;
    applyWatchPartyPermissions({ root, watchParty });
    context.mediaSession?.refresh();
    context.refreshSegmentButton?.();
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
