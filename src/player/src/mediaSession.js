// Hardware media keys, headset buttons and the lock screen / system media
// panel go through the Media Session API. In a watch party only members who
// may control playback get the actions.

const ACTIONS = ['play', 'pause', 'seekbackward', 'seekforward'];
const POSITION_UPDATE_MS = 1_000;

export function createMediaSession(context, { session = globalThis.navigator?.mediaSession, MediaMetadataClass = globalThis.MediaMetadata } = {}) {
  if (!session) return { refresh() {}, destroy() {} };
  const { player, title, subtitle, poster } = context;
  let lastPositionUpdate = 0;

  const setHandler = (action, handler) => {
    try {
      session.setActionHandler(action, handler);
    } catch {
      // Not every browser knows every action.
    }
  };

  if (typeof MediaMetadataClass === 'function') {
    try {
      session.metadata = new MediaMetadataClass({
        title: title || '',
        artist: subtitle || '',
        album: 'VANTA',
        artwork: poster ? [{ src: poster, sizes: '1280x720', type: 'image/webp' }] : []
      });
    } catch {
      // Metadata is a nicety.
    }
  }

  const refresh = () => {
    const allowed = !context.watchParty?.enabled || context.canControlWatchParty();
    setHandler('play', allowed ? () => player.play().catch(() => {}) : null);
    setHandler('pause', allowed ? () => player.pause() : null);
    setHandler('seekbackward', allowed ? () => context.seekStep(-10) : null);
    setHandler('seekforward', allowed ? () => context.seekStep(10) : null);
  };

  const syncState = () => {
    session.playbackState = player.paused ? 'paused' : 'playing';
  };

  const syncPosition = () => {
    const now = performance.now();
    if (now - lastPositionUpdate < POSITION_UPDATE_MS || typeof session.setPositionState !== 'function') return;
    lastPositionUpdate = now;
    const duration = Number(player.duration);
    const position = Number(player.currentTime);
    if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(position)) return;
    try {
      session.setPositionState({ duration, position: Math.min(position, duration), playbackRate: Number(player.playbackRate) || 1 });
    } catch {
      // Out-of-range values during source switches.
    }
  };

  context.listen(player, 'play', syncState);
  context.listen(player, 'pause', syncState);
  context.listen(player, 'time-update', syncPosition);
  refresh();

  return {
    refresh,
    destroy() {
      ACTIONS.forEach(action => setHandler(action, null));
      try {
        session.metadata = null;
        session.playbackState = 'none';
      } catch {
        // ignore
      }
    }
  };
}
