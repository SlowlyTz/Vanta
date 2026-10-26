import { describe, it, expect } from 'vitest';
import { StreamSessionService } from '../../../src/server/services/stream-session.service.js';

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

  it('ersetzt beim Tonspurwechsel die laufende Session, statt einen zweiten Stream zu zählen', () => {
    const { service, advance } = createService(1);
    service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p1' });
    service.markStarted('u1', 'p1');
    advance(5_000);

    expect(() => service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p2' }))
      .toThrow(expect.objectContaining({ code: 'STREAM_LIMIT_REACHED' }));
    expect(() => service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p2', replacesPlaySessionId: 'p1' })).not.toThrow();
    expect(service.getActiveCount('u1')).toBe(1);
    // Eine fremde Session lässt sich so nicht verdrängen.
    expect(() => service.reserve({ userId: 'u2', itemId: 'item-a', playSessionId: 'p3', replacesPlaySessionId: 'p2' })).not.toThrow();
    expect(service.getActiveCount('u1')).toBe(1);
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

    expect(released).toMatchObject({ playSessionId: 'p1', state: 'reserved' });
    expect(service.release('u1', 'p1')).toBeNull();
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

  it('TTL cleans up a hung playing session after the active TTL', () => {
    const { service, advance } = createService(1);

    service.reserve({ userId: 'u1', itemId: 'item-a', playSessionId: 'p1' });
    service.markStarted('u1', 'p1');
    advance(60_000);
    expect(service.getActiveCount('u1')).toBe(1);
    advance(31_000);

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

  describe('one stream per device', () => {
    const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/155.0 Mobile/15E148 Safari/604.1';
    const IPAD = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/155.0 Mobile/15E148 Safari/604.1';

    it('a new title on the same device replaces a session left before it started', () => {
      const { service, advance } = createService(1);
      service.reserve({ userId: 'u1', itemId: 'episode-1', playSessionId: 'p1', deviceId: 'phone', userAgent: IPHONE });
      advance(20_000);

      const replaced = service.reserve({ userId: 'u1', itemId: 'episode-2', playSessionId: 'p2', deviceId: 'phone', userAgent: IPHONE });

      expect(replaced).toEqual(['p1']);
      expect(service.getActiveCount('u1')).toBe(1);
      expect(service.sessionsByUser.get('u1').has('p2')).toBe(true);
    });

    it('also replaces a playing session of the same device', () => {
      const { service } = createService(1);
      service.reserve({ userId: 'u1', itemId: 'a', playSessionId: 'p1', deviceId: 'phone' });
      service.markStarted('u1', 'p1');

      expect(service.reserve({ userId: 'u1', itemId: 'b', playSessionId: 'p2', deviceId: 'phone' })).toEqual(['p1']);
    });

    it('keeps blocking another device and names the device holding the slot', () => {
      const { service, advance } = createService(1);
      service.reserve({ userId: 'u1', itemId: 'a', playSessionId: 'p1', deviceId: 'tablet', userAgent: IPAD });
      service.markStarted('u1', 'p1');
      for (let i = 0; i < 6; i += 1) {
        advance(30_000);
        service.touch('u1', 'p1');
      }

      let error;
      try {
        service.reserve({ userId: 'u1', itemId: 'b', playSessionId: 'p2', deviceId: 'phone', userAgent: IPHONE });
      } catch (caught) {
        error = caught;
      }

      expect(error).toMatchObject({ status: 429, code: 'STREAM_LIMIT_REACHED', limit: 1, activeStreams: 1 });
      expect(error.message).toBe('Auf deinem Konto läuft schon ein Stream (Chrome auf iPad, seit 3 Min.). Beende ihn dort oder versuche es in einer Minute noch einmal.');
      expect(service.sessionsByUser.get('u1').has('p1')).toBe(true);
    });

    it('hands back what the same device gave up even when another device blocks', () => {
      const { service } = createService(1);
      service.reserve({ userId: 'u1', itemId: 'a', playSessionId: 'p1', deviceId: 'tablet' });
      service.sessionsByUser.get('u1').set('p0', { userId: 'u1', itemId: 'x', playSessionId: 'p0', deviceId: 'phone', state: 'reserved', createdAt: service.now(), updatedAt: service.now() });

      expect(() => service.reserve({ userId: 'u1', itemId: 'b', playSessionId: 'p2', deviceId: 'phone' }))
        .toThrow(expect.objectContaining({ code: 'STREAM_LIMIT_REACHED', replaced: ['p0'] }));
    });

    it('says the account may not play when the limit is 0', () => {
      const { service } = createService(0);
      expect(() => service.reserve({ userId: 'u1', itemId: 'a', playSessionId: 'p1', deviceId: 'phone' }))
        .toThrow('Für dein Konto ist das Abspielen gerade gesperrt.');
    });
  });

  describe('an open player counts until it is closed', () => {
    it('a paused player that keeps reporting holds its slot for good', () => {
      const { service, advance } = createService(1);
      service.reserve({ userId: 'u1', itemId: 'a', playSessionId: 'p1', deviceId: 'tv' });
      service.markStarted('u1', 'p1');
      for (let i = 0; i < 30; i += 1) {
        advance(10_000);
        service.touch('u1', 'p1');
      }
      expect(() => service.reserve({ userId: 'u1', itemId: 'b', playSessionId: 'p2', deviceId: 'phone' }))
        .toThrow(expect.objectContaining({ code: 'STREAM_LIMIT_REACHED' }));
      service.release('u1', 'p1');
      expect(service.getActiveCount('u1')).toBe(0);
    });

    it('a stream the server lost track of is counted again, unless the limit is full', () => {
      const { service, advance } = createService(1);
      service.reserve({ userId: 'u1', itemId: 'a', playSessionId: 'p1', deviceId: 'tv' });
      advance(120_000);
      expect(service.getActiveCount('u1')).toBe(0);
      service.resume({ userId: 'u1', itemId: 'a', playSessionId: 'p1', deviceId: 'tv' });
      expect(service.sessionsByUser.get('u1').get('p1').state).toBe('playing');

      service.release('u1', 'p1');
      service.reserve({ userId: 'u1', itemId: 'b', playSessionId: 'p2', deviceId: 'phone' });
      expect(() => service.resume({ userId: 'u1', itemId: 'a', playSessionId: 'p1', deviceId: 'tv' }))
        .toThrow(expect.objectContaining({ code: 'STREAM_LIMIT_REACHED' }));
    });
  });

  describe('admitStreamRequest', () => {
    const request = (playSessionId, extra = {}) => ({ userId: 'u1', itemId: 'item-a', playSessionId, deviceId: 'd1', ...extra });

    it('keeps a held session and counts an unknown one again', () => {
      const { service } = createService(1);
      service.reserve(request('p1'));
      expect(service.admitStreamRequest(request('p1'))).toEqual([]);
      service.release('u1', 'p1');
      expect(() => service.admitStreamRequest(request('p1'))).not.toThrow();
      expect(service.getActiveCount('u1')).toBe(1);
    });

    it('refuses a replaced session and a stream over the limit', () => {
      const { service } = createService(1);
      service.reserve(request('p1'));
      service.reserve(request('p2', { replacesPlaySessionId: 'p1' }));
      expect(() => service.admitStreamRequest(request('p1'))).toThrow(expect.objectContaining({ status: 403 }));
      expect(() => service.admitStreamRequest(request('p3', { deviceId: 'd2', itemId: 'item-b' })))
        .toThrow(expect.objectContaining({ code: 'STREAM_LIMIT_REACHED' }));
    });
  });
});
