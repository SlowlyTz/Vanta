import { describe, it, expect, vi } from 'vitest';
import { createServerClock, pickBestSample, readSkewFromLocation } from '../../../src/public/js/realtime/serverClock.js';

function createHarness({ serverAhead = 0, skewMs = 0 } = {}) {
  let local = 1_000_000;
  const sent = [];
  const timers = [];
  const clock = createServerClock({
    send: payload => sent.push(payload),
    localNow: () => local,
    skewMs,
    setTimer: (fn, ms) => {
      timers.push({ fn, at: local + ms });
      return timers.length;
    },
    clearTimer: () => {}
  });

  // Answers the most recent ping as a server whose clock runs `serverAhead`
  // milliseconds ahead of the local one, with the given one-way delays.
  const answer = ({ up, down }) => {
    const ping = sent.at(-1);
    local += up;
    const serverTimeMs = local + serverAhead;
    local += down;
    clock.handlePong({ clientSentAt: ping.clientSentAt, serverTimeMs });
  };

  const sendPing = () => {
    const timer = timers.shift();
    timer.fn();
  };

  return { clock, sent, answer, sendPing, advance: ms => { local += ms; }, getLocal: () => local };
}

describe('serverClock', () => {
  it('nutzt vor der ersten Messung die lokale Zeit', () => {
    const { clock, getLocal } = createHarness();
    expect(clock.synced).toBe(false);
    expect(clock.now()).toBe(getLocal());
  });

  it('startet mit einem Burst aus TIME_PING-Nachrichten', () => {
    const { clock, sent, sendPing } = createHarness();
    clock.start();
    for (let i = 0; i < 6; i++) sendPing();
    expect(sent).toHaveLength(6);
    expect(sent.every(message => message.type === 'TIME_PING')).toBe(true);
  });

  it('gleicht eine um drei Sekunden falsch gehende Uhr aus', async () => {
    const { clock, sendPing, answer, getLocal } = createHarness({ serverAhead: 3_000 });
    clock.start();
    sendPing();
    answer({ up: 40, down: 40 });

    await clock.ready;
    expect(clock.synced).toBe(true);
    expect(clock.rtt).toBe(80);
    expect(clock.now() - getLocal()).toBe(3_000);
  });

  it('bevorzugt die Messung mit der kleinsten Umlaufzeit', () => {
    const { clock, sendPing, answer, getLocal } = createHarness({ serverAhead: 500 });
    clock.start();

    sendPing();
    answer({ up: 400, down: 20 }); // asymmetric and slow, skews the estimate
    sendPing();
    answer({ up: 10, down: 10 });

    expect(clock.rtt).toBe(20);
    expect(Math.round(clock.now() - getLocal())).toBe(500);
  });

  it('rechnet die künstliche Verstellung aus wpSkew wieder heraus', () => {
    const { clock, sendPing, answer, getLocal } = createHarness({ serverAhead: 0, skewMs: 4_000 });
    clock.start();
    sendPing();
    answer({ up: 25, down: 25 });

    expect(Math.round(clock.now() - getLocal())).toBe(0);
  });

  it('ignoriert unbrauchbare Antworten', () => {
    const { clock } = createHarness();
    clock.handlePong({ clientSentAt: 'x', serverTimeMs: 5 });
    clock.handlePong({});
    expect(clock.synced).toBe(false);
  });

  it('sendet nach stop keine Pings mehr', () => {
    const send = vi.fn();
    const clock = createServerClock({ send, setTimer: vi.fn(), clearTimer: vi.fn() });
    clock.stop();
    clock.start();
    expect(send).not.toHaveBeenCalled();
  });
});

describe('pickBestSample', () => {
  it('liefert die Probe mit minimaler RTT', () => {
    expect(pickBestSample([{ rtt: 90, offset: 1 }, { rtt: 30, offset: 2 }, { rtt: 60, offset: 3 }])).toEqual({ rtt: 30, offset: 2 });
    expect(pickBestSample([])).toBeNull();
  });
});

describe('readSkewFromLocation', () => {
  it('liest wpSkew aus der Query', () => {
    expect(readSkewFromLocation({ search: '?wpSkew=3000' })).toBe(3000);
    expect(readSkewFromLocation({ search: '?wpSkew=-1500' })).toBe(-1500);
    expect(readSkewFromLocation({ search: '' })).toBe(0);
    expect(readSkewFromLocation({ search: '?wpSkew=abc' })).toBe(0);
  });
});
