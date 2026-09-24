import { describe, it, expect, vi } from 'vitest';
import { createTapRecognizer, tapSide, DOUBLE_TAP_MS, SEEK_STREAK_MS } from '../../../src/player/src/player/touchTaps.js';

function setup() {
  let now = 0;
  const timers = [];
  const onSingle = vi.fn();
  const onSeek = vi.fn();
  const recognizer = createTapRecognizer({
    onSingle,
    onSeek,
    now: () => now,
    setTimer: (fn, ms) => { const timer = { fn, at: now + ms, done: false }; timers.push(timer); return timer; },
    clearTimer: timer => { if (timer) timer.done = true; }
  });
  const advance = ms => {
    now += ms;
    timers.filter(timer => !timer.done && timer.at <= now).forEach(timer => { timer.done = true; timer.fn(); });
  };
  return { recognizer, onSingle, onSeek, advance };
}

const WIDTH = 900;

describe('tapSide', () => {
  it('teilt das Bild in Drittel', () => {
    expect(tapSide(100, WIDTH)).toBe('back');
    expect(tapSide(450, WIDTH)).toBeNull();
    expect(tapSide(800, WIDTH)).toBe('forward');
  });
});

describe('createTapRecognizer', () => {
  it('meldet einen einzelnen Tipp erst, wenn kein zweiter kommt', () => {
    const { recognizer, onSingle, onSeek, advance } = setup();
    recognizer.tap({ x: 100, y: 100, width: WIDTH });
    expect(onSingle).not.toHaveBeenCalled();
    advance(DOUBLE_TAP_MS);
    expect(onSingle).toHaveBeenCalledTimes(1);
    expect(onSeek).not.toHaveBeenCalled();
  });

  it('spult bei Doppeltipp auf der Seite und bei jedem weiteren Tipp der Serie', () => {
    const { recognizer, onSingle, onSeek, advance } = setup();
    recognizer.tap({ x: 820, y: 200, width: WIDTH });
    advance(150);
    recognizer.tap({ x: 830, y: 205, width: WIDTH });
    expect(onSeek).toHaveBeenLastCalledWith('forward');

    advance(400);
    recognizer.tap({ x: 700, y: 300, width: WIDTH });
    advance(400);
    recognizer.tap({ x: 700, y: 300, width: WIDTH });
    expect(onSeek).toHaveBeenCalledTimes(3);

    advance(SEEK_STREAK_MS + 50);
    recognizer.tap({ x: 700, y: 300, width: WIDTH });
    advance(DOUBLE_TAP_MS);
    expect(onSeek).toHaveBeenCalledTimes(3);
    expect(onSingle).toHaveBeenCalledTimes(1);
  });

  it('spult nicht bei Doppeltipp in der Mitte oder bei weit auseinanderliegenden Tipps', () => {
    const { recognizer, onSeek, advance } = setup();
    recognizer.tap({ x: 450, y: 200, width: WIDTH });
    advance(100);
    recognizer.tap({ x: 452, y: 200, width: WIDTH });
    advance(DOUBLE_TAP_MS * 2);
    recognizer.tap({ x: 50, y: 50, width: WIDTH });
    advance(100);
    recognizer.tap({ x: 50, y: 400, width: WIDTH });
    expect(onSeek).not.toHaveBeenCalled();
  });
});
