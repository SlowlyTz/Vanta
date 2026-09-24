import { describe, it, expect, vi } from 'vitest';
import { createMediaSession } from '../../../src/player/src/mediaSession.js';

function setup({ party = null, canControl = true } = {}) {
  const handlers = {};
  const session = {
    metadata: null,
    playbackState: 'none',
    setActionHandler: vi.fn((action, handler) => { handlers[action] = handler; }),
    setPositionState: vi.fn()
  };
  const player = new EventTarget();
  Object.assign(player, { paused: true, currentTime: 30, duration: 600, playbackRate: 1, play: vi.fn(() => Promise.resolve()), pause: vi.fn() });
  const context = {
    player,
    title: 'Dark',
    subtitle: 'S1 · F3',
    poster: '/p.webp',
    watchParty: party,
    canControlWatchParty: () => canControl,
    seekStep: vi.fn(),
    listen: (target, event, handler) => target.addEventListener(event, handler)
  };
  function Metadata(init) { Object.assign(this, init); }
  const media = createMediaSession(context, { session, MediaMetadataClass: Metadata });
  return { media, session, handlers, context, player };
}

describe('createMediaSession', () => {
  it('meldet Titel und Artwork und steuert über die Medientasten', () => {
    const { session, handlers, context, player } = setup();
    expect(session.metadata).toMatchObject({ title: 'Dark', artist: 'S1 · F3' });

    handlers.play();
    handlers.pause();
    handlers.seekbackward();
    handlers.seekforward();
    expect(player.play).toHaveBeenCalled();
    expect(player.pause).toHaveBeenCalled();
    expect(context.seekStep).toHaveBeenCalledWith(-10);
    expect(context.seekStep).toHaveBeenCalledWith(10);

    player.paused = false;
    player.dispatchEvent(new Event('play'));
    expect(session.playbackState).toBe('playing');
  });

  it('gibt Zuschauern einer Party keine Medientasten', () => {
    const { handlers } = setup({ party: { enabled: true }, canControl: false });
    expect(handlers.play).toBeNull();
    expect(handlers.seekforward).toBeNull();
  });

  it('räumt beim Abbau auf und kommt ohne API aus', () => {
    const { media, session } = setup();
    media.destroy();
    expect(session.metadata).toBeNull();
    expect(() => createMediaSession({}, { session: undefined }).destroy()).not.toThrow();
  });
});
