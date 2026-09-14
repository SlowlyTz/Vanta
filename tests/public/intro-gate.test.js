import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/public/js/intro-gate.js'), 'utf8');
const TEN_MINUTES = 10 * 60 * 1000;

function loadGate({ hash = '#/home', lastPlayedAt = null, now = 1_000_000_000, load } = {}) {
  document.documentElement.className = '';
  document.body.innerHTML = '<div id="intro"><canvas></canvas></div><div id="app"></div>';
  localStorage.clear();
  if (lastPlayedAt !== null) localStorage.setItem('vanta.intro.lastPlayedAt', String(lastPlayedAt));
  window.location.hash = hash;
  vi.spyOn(Date, 'now').mockReturnValue(now);
  // The script kicks off the real import() when it decides to play; keep
  // that from reaching the network by pre-stubbing what it reads.
  window.__introLoad = load || (() => new Promise(() => {}));
  new Function('window', source.replace("import('/vendor/intro/vanta-intro.js')", 'window.__introLoad()'))(window);
  return window.VantaIntroGate;
}

describe('intro-gate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete window.VantaIntroGate;
  });

  it('plays on the first visit and records the time', () => {
    loadGate();
    expect(document.documentElement.classList.contains('intro-off')).toBe(false);
    expect(localStorage.getItem('vanta.intro.lastPlayedAt')).toBe('1000000000');
  });

  it('skips a reload within ten minutes and keeps the old timestamp', () => {
    const last = 1_000_000_000 - TEN_MINUTES + 1;
    loadGate({ lastPlayedAt: last });
    expect(document.documentElement.classList.contains('intro-off')).toBe(true);
    expect(localStorage.getItem('vanta.intro.lastPlayedAt')).toBe(String(last));
  });

  it('plays again once ten minutes have passed', () => {
    loadGate({ lastPlayedAt: 1_000_000_000 - TEN_MINUTES });
    expect(document.documentElement.classList.contains('intro-off')).toBe(false);
    expect(localStorage.getItem('vanta.intro.lastPlayedAt')).toBe('1000000000');
  });

  it('treats a corrupt timestamp as never played', () => {
    loadGate({ lastPlayedAt: 'abc' });
    expect(document.documentElement.classList.contains('intro-off')).toBe(false);
  });

  it('skips the player and watch-party routes without touching the timestamp', () => {
    loadGate({ hash: '#/player/abc' });
    expect(document.documentElement.classList.contains('intro-off')).toBe(true);
    expect(localStorage.getItem('vanta.intro.lastPlayedAt')).toBeNull();

    loadGate({ hash: '#/watch-party/xyz' });
    expect(document.documentElement.classList.contains('intro-off')).toBe(true);
  });

  it('exposes the pure decision', () => {
    const gate = loadGate();
    expect(gate.shouldPlay({ now: 100, lastPlayedAt: null, hash: '#/login' })).toBe(true);
    expect(gate.shouldPlay({ now: TEN_MINUTES, lastPlayedAt: 1, hash: '' })).toBe(false);
    expect(gate.shouldPlay({ now: TEN_MINUTES + 1, lastPlayedAt: 1, hash: '' })).toBe(true);
    expect(gate.shouldPlay({ now: 100, lastPlayedAt: null, hash: '#/player/1' })).toBe(false);
    expect(gate.shouldPlay({ now: 100, lastPlayedAt: null, hash: '', online: false })).toBe(false);
    expect(gate.shouldPlay({ now: 100, lastPlayedAt: null, hash: '', online: true })).toBe(true);
  });

  it('starts fetching the scene at decision time, but only when it plays', () => {
    const load = vi.fn(() => new Promise(() => {}));
    loadGate({ load });
    expect(load).toHaveBeenCalledTimes(1);

    loadGate({ load, lastPlayedAt: 1_000_000_000 });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('removes the cover after the scene finished', async () => {
    const gate = loadGate();
    const overlay = document.getElementById('intro');
    const playIntro = vi.fn().mockResolvedValue();

    await gate.start(Promise.resolve({ playIntro }));

    expect(playIntro).toHaveBeenCalledWith(overlay);
    expect(document.getElementById('intro')).toBeNull();
  });

  it('removes the cover when the scene cannot be loaded', async () => {
    const gate = loadGate();
    gate.load = () => Promise.reject(new Error('no webgl'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await gate.start();

    expect(document.getElementById('intro')).toBeNull();
    expect(console.warn).toHaveBeenCalledWith('[Intro] skipped:', 'no webgl');
  });

  it('removes the cover through the watchdog when the scene hangs', async () => {
    vi.useFakeTimers();
    const gate = loadGate();
    gate.load = () => new Promise(() => {});

    gate.start();
    vi.advanceTimersByTime(12000);

    expect(document.getElementById('intro')).toBeNull();
    vi.useRealTimers();
  });
});
