import { clampSeekTarget } from '../seek.js';

const HAVE_FUTURE_DATA = 3;
const MIN_SEEK_DELTA_SECONDS = 0.05;

export class AutoplayBlockedError extends Error {
  constructor() {
    super('Der Browser hat die automatische Wiedergabe blockiert.');
    this.name = 'NotAllowedError';
  }
}

// The narrow surface the watch-party page drives playback through. Every
// change books an echo token first, so the resulting media event is not sent
// back to the server as an owner command.
export function bindSyncControls(context) {
  const { player, listen, echoTokens } = context;
  const now = () => performance.now();
  let lastDisruptionAt = now();

  const markDisruption = () => { lastDisruptionAt = now(); };
  ['waiting', 'seeking', 'pause', 'play', 'source-change'].forEach(event => listen(player, event, markDisruption));

  const video = () => player.querySelector?.('video') || null;

  const isBusy = () => {
    if (context.sourceSwitch.isSwitching()) return true;
    const element = video();
    if (!element) return false;
    if (element.seeking) return true;
    return !element.paused && element.readyState < HAVE_FUTURE_DATA;
  };

  context.getSyncState = () => {
    const busy = isBusy();
    if (busy) markDisruption();
    return {
      ready: Boolean(context.sourceSwitch.getCurrentPlayback()) && !context.destroyed,
      currentTime: Number(player.currentTime) || 0,
      paused: Boolean(player.paused),
      busy,
      rate: Number(player.playbackRate) || 1,
      stableMs: player.paused ? 0 : Math.max(0, now() - lastDisruptionAt),
      autoplayBlocked: context.sourceSwitch.getAutoplayBlocked()
    };
  };

  context.getBufferedAhead = (position = player.currentTime) => {
    const ranges = video()?.buffered;
    if (!ranges) return 0;
    for (let i = 0; i < ranges.length; i++) {
      if (ranges.start(i) <= position + 0.25 && ranges.end(i) >= position) {
        return Math.max(0, ranges.end(i) - position);
      }
    }
    return 0;
  };

  context.setSyncRate = rate => {
    const next = Number(rate) || 1;
    if (Math.abs((Number(player.playbackRate) || 1) - next) < 0.001) return;
    player.playbackRate = next;
  };

  context.syncSeek = seconds => {
    const target = clampSeekTarget(seconds, player);
    if (!Number.isFinite(target)) return;
    if (Math.abs((Number(player.currentTime) || 0) - target) < MIN_SEEK_DELTA_SECONDS) return;
    echoTokens.expect('seek');
    markDisruption();
    player.currentTime = target;
  };

  context.syncPlay = async ({ quiet = true } = {}) => {
    if (!player.paused) return;
    echoTokens.expect('play');
    context.sourceSwitch.setIntendsToPlay(true);
    await context.sourceSwitch.startCurrentPlayback({ quiet });
    if (context.sourceSwitch.getAutoplayBlocked()) throw new AutoplayBlockedError();
  };

  context.syncPause = () => {
    if (player.paused) return;
    echoTokens.expect('pause');
    context.sourceSwitch.setIntendsToPlay(false);
    player.pause();
  };

  // Tapping "Ready" is the one user gesture before the synced start. Playing
  // muted for a moment inside it unlocks unmuted playback later on iOS and in
  // Chrome; the pause right after keeps the preloaded frame in place.
  context.unlockPlayback = () => {
    const element = video();
    if (!element) return Promise.resolve(false);
    const wasMuted = element.muted;
    const position = element.currentTime;
    element.muted = true;
    let attempt;
    try {
      attempt = element.play();
    } catch {
      attempt = Promise.reject();
    }
    return Promise.resolve(attempt)
      .then(() => true, () => false)
      .then(unlocked => {
        element.pause();
        element.muted = wasMuted;
        if (Math.abs(element.currentTime - position) > MIN_SEEK_DELTA_SECONDS) element.currentTime = position;
        return unlocked;
      });
  };

  return context;
}
