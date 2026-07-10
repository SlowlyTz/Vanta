import { describe, it, expect, vi } from 'vitest';
import { StreamSessionService } from './stream-session.service.js';

function createService(maxConcurrentStreams = 1, startTime = 1_000_000) {
  let currentTime = startTime;
  const service = new StreamSessionService({
    getUserSettings: () => ({ maxConcurrentStreams }),
    now: () => currentTime
  });
  return {
    service,
    advance: (ms) => { currentTime += ms; },
    setTime: (t) => { currentTime = t; }
  };
}

describe('StreamSessionService', () => {
  it('allows a single stream by default and blocks a second one', () => {
    const { service } = createService(1);

    expect(() => service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p1' })).not.toThrow();
    expect(service.getActiveCount('u1')).toBe(1);

    expect(() => service.reserve({ userId: 'u1', itemId: 'item-b', playSessionId: 'p2' }))
      .toThrow(expect.objectContaining({ status: 429, code: 'STREAM_LIMIT_REACHED' }));
  });

  it('allows exactly maxConcurrentStreams=2 streams and blocks the third', () => {
    const { service } = createService(2);

    service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p1' });
    service.reserve({ userId: 'u1', itemId: 'item-b', playSessionId: 'p2' });
    expect(service.getActiveCount('u1')).toBe(2);

    expect(() => service.reserve({ userId: 'u1', itemId: 'item-c', playSessionId: 'p3' }))
      .toThrow(expect.objectContaining({ status: 429, limit: 2, activeStreams: 2 }));
  });

  it('blocks every new stream when maxConcurrentStreams=0', () => {
    const { service } = createService(0);

    expect(() => service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p1' }))
      .toThrow(expect.objectContaining({ status: 429, limit: 0 }));
  });

  it('re-reserving the same playSessionId does not count as a second stream', () => {
    const { service } = createService(1);

    service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p1' });
    expect(() => service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p1' })).not.toThrow();
    expect(service.getActiveCount('u1')).toBe(1);
  });

  it('release on stopped/ended frees the slot for a new stream', () => {
    const { service } = createService(1);

    service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p1' });
    const released = service.release('u1', 'p1');

    expect(released).toBe(true);
    expect(service.getActiveCount('u1')).toBe(0);
    expect(() => service.reserve({ userId: 'u1', itemId: 'item-b', playSessionId: 'p2' })).not.toThrow();
  });

  it('markStarted transitions a reserved session to playing', () => {
    const { service } = createService(1);

    service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p1' });
    service.markStarted('u1', 'p1');

    const session = service.sessionsByUser.get('u1').get('p1');
    expect(session.state).toBe('playing');
  });

  it('touch on an unknown session returns false without throwing', () => {
    const { service } = createService(1);
    expect(service.touch('u1', 'unknown')).toBe(false);
  });

  it('TTL cleans up a hung reserved session so a new stream can start', () => {
    const { service, advance } = createService(1);

    service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p1' });
    advance(61_000);

    expect(service.getActiveCount('u1')).toBe(0);
    expect(() => service.reserve({ userId: 'u1', itemId: 'item-b', playSessionId: 'p2' })).not.toThrow();
  });

  it('TTL cleans up a hung playing session after the shorter active TTL', () => {
    const { service, advance } = createService(1);

    service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p1' });
    service.markStarted('u1', 'p1');
    advance(46_000);

    expect(service.getActiveCount('u1')).toBe(0);
  });

  it('keeps an active session alive across progress touches within TTL', () => {
    const { service, advance } = createService(1);

    service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p1' });
    service.markStarted('u1', 'p1');

    advance(30_000);
    service.touch('u1', 'p1');
    advance(30_000);

    expect(service.getActiveCount('u1')).toBe(1);
  });

  it('replaces a very recent reserved session for the same item instead of blocking a quality switch', () => {
    const { service, advance } = createService(1);

    service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p1' });
    advance(2_000);

    expect(() => service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p2' })).not.toThrow();
    expect(service.getActiveCount('u1')).toBe(1);
    expect(service.sessionsByUser.get('u1').has('p1')).toBe(false);
    expect(service.sessionsByUser.get('u1').has('p2')).toBe(true);
  });

  it('does not replace a reserved session for a different item', () => {
    const { service } = createService(1);

    service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p1' });

    expect(() => service.reserve({ userId: 'u1', itemId: 'item-b', playSessionId: 'p2' }))
      .toThrow(expect.objectContaining({ status: 429 }));
  });

  it('does not replace a reserved session older than the quality-switch window', () => {
    const { service, advance } = createService(1);

    service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p1' });
    advance(11_000);

    expect(() => service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p2' }))
      .toThrow(expect.objectContaining({ status: 429 }));
  });

  it('tracks multiple users independently', () => {
    const { service } = createService(1);

    service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p1' });
    expect(() => service.reserve({ userId: 'u2', itemId: 'item-a', playSessionId: 'p2' })).not.toThrow();

    expect(service.getActiveCount('u1')).toBe(1);
    expect(service.getActiveCount('u2')).toBe(1);
  });

  it('throws a 500 tracking error when no playSessionId is available', () => {
    const { service } = createService(1);
    expect(() => service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: null }))
      .toThrow(expect.objectContaining({ status: 500 }));
  });
});
