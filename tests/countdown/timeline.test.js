import { describe, it, expect } from 'vitest';
import { countdownAt, secondsIntoCountdown, LEAD_SECONDS, FADE } from '../../src/countdown/src/timeline.js';

describe('secondsIntoCountdown', () => {
  it('rechnet aus der Startzeit und der Server-Uhr, nicht aus vergangenen Frames', () => {
    expect(secondsIntoCountdown(10_000, 5_000)).toBe(0);
    expect(secondsIntoCountdown(10_000, 7_500)).toBe(2.5);
    expect(secondsIntoCountdown(10_000, 4_600)).toBeCloseTo(-0.4);
    expect(secondsIntoCountdown(10_000, 10_000)).toBe(5);
  });
});

describe('countdownAt', () => {
  it('zeigt jede Ziffer genau eine Sekunde: 5, 4, 3, 2, 1', () => {
    expect([0, 1, 2, 3, 4].map(s => countdownAt(s + 0.5).digit)).toEqual([5, 4, 3, 2, 1]);
    expect(countdownAt(0.999).digit).toBe(5);
    expect(countdownAt(1).digit).toBe(4);
    expect(countdownAt(4.999).digit).toBe(1);
  });

  it('sammelt die Partikel im Vorlauf zur ersten Ziffer', () => {
    expect(countdownAt(-LEAD_SECONDS).gather).toBe(0);
    expect(countdownAt(-LEAD_SECONDS / 2).gather).toBeCloseTo(0.5);
    expect(countdownAt(0).gather).toBe(1);
    expect(countdownAt(-LEAD_SECONDS).digit).toBe(5);
  });

  it('morpht zu Beginn jeder Sekunde aus der vorherigen Ziffer', () => {
    expect(countdownAt(0.2)).toMatchObject({ from: 0, to: 0, morph: 1 });
    const early = countdownAt(2.1);
    expect(early.from).toBe(1);
    expect(early.to).toBe(2);
    expect(early.morph).toBeCloseTo(1 / 3);
    expect(countdownAt(2.5).morph).toBe(1);
  });

  it('lockert die Ziffer am Ende einer Sekunde und fängt sie im Morph wieder ein, stetig', () => {
    expect(countdownAt(1.5).loosen).toBe(0);
    expect(countdownAt(1.9999).loosen).toBeCloseTo(1, 2);
    expect(countdownAt(2).loosen).toBe(1);
    expect(countdownAt(2.3).loosen).toBe(0);
    // The last digit stays solid for the dive.
    expect(countdownAt(4.99).loosen).toBe(0);
  });

  it('taucht in der letzten Sekunde durch die 1 und blendet bis genau 5,0 s aus', () => {
    expect(countdownAt(4.5)).toMatchObject({ dive: 0, fade: 0, done: false });
    expect(countdownAt(FADE[0] + 0.2).fade).toBeCloseTo(0.5);
    expect(countdownAt(5)).toMatchObject({ dive: 1, fade: 1, done: true });
    expect(countdownAt(7).done).toBe(true);
  });
});

describe('withLateGather', () => {
  it('lässt eine spät fertige Szene die Partikel trotzdem zusammenfliegen', async () => {
    const { withLateGather, LATE_GATHER_SECONDS } = await import('../../src/countdown/src/timeline.js');
    const at = countdownAt(0.6);
    expect(at.gather).toBe(1);
    expect(withLateGather(at, 0).gather).toBe(0);
    expect(withLateGather(at, LATE_GATHER_SECONDS / 2).gather).toBeGreaterThan(0);
    expect(withLateGather(at, LATE_GATHER_SECONDS)).toBe(at);
    // Rechtzeitig fertig: der Server-Vorlauf bestimmt weiter.
    const lead = countdownAt(-0.3);
    expect(withLateGather(lead, 1)).toBe(lead);
    expect(withLateGather(at, 0).digit).toBe(5);
  });
});
