import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createNextEpisodePrompt } from '../../../src/player/src/nextEpisodePrompt.js';

function makeNext(overrides = {}) {
  return {
    kind: 'next-episode',
    episode: { Id: 'ep-2', Name: 'Folge 2', ParentIndexNumber: 1, IndexNumber: 2 },
    season: { Id: 'season-1' },
    fromSeason: { Id: 'season-1' },
    ...overrides
  };
}

describe('createNextEpisodePrompt', () => {
  let root;
  let rafCallbacks;
  let now;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);

    now = 0;
    rafCallbacks = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    root.remove();
  });

  function flushFrame(atTime) {
    now = atTime;
    const callbacks = rafCallbacks.splice(0);
    callbacks.forEach(cb => cb(now));
  }

  it('ist initial versteckt und zeigt Episodendaten beim show()', () => {
    const prompt = createNextEpisodePrompt({ root, onConfirm: vi.fn(), onDismiss: vi.fn() });
    expect(prompt.element.hidden).toBe(true);

    prompt.show(makeNext());
    expect(prompt.element.hidden).toBe(false);
    expect(prompt.element.textContent).toContain('S01E02');
    expect(prompt.element.textContent).toContain('Folge 2');
    expect(prompt.confirmButton.textContent).toBe('Nächste Folge starten');

    prompt.destroy();
  });

  it('unterscheidet den Text zwischen nächster Folge und nächster Staffel', () => {
    const prompt = createNextEpisodePrompt({ root, onConfirm: vi.fn(), onDismiss: vi.fn() });
    prompt.show(makeNext({ kind: 'next-season' }));
    expect(prompt.confirmButton.textContent).toBe('Nächste Staffel starten');
    prompt.destroy();
  });

  it('Bestätigen ruft onConfirm sofort auf und schließt das Overlay', () => {
    const onConfirm = vi.fn();
    const prompt = createNextEpisodePrompt({ root, onConfirm, onDismiss: vi.fn() });
    const next = makeNext();
    prompt.show(next);

    prompt.confirmButton.click();

    expect(onConfirm).toHaveBeenCalledWith(next, { auto: false });
    expect(prompt.element.hidden).toBe(true);
    prompt.destroy();
  });

  it('Abbrechen ruft onDismiss auf und schließt das Overlay dauerhaft', () => {
    const onDismiss = vi.fn();
    const prompt = createNextEpisodePrompt({ root, onConfirm: vi.fn(), onDismiss });
    const next = makeNext();
    prompt.show(next);

    prompt.dismissButton.click();

    expect(onDismiss).toHaveBeenCalledWith(next);
    expect(prompt.element.hidden).toBe(true);
    prompt.destroy();
  });

  it('bestätigt automatisch, wenn der Countdown-Fortschritt voll ist', () => {
    const onConfirm = vi.fn();
    const prompt = createNextEpisodePrompt({ root, onConfirm, onDismiss: vi.fn(), countdownMs: 1000 });
    const next = makeNext();
    prompt.show(next);

    flushFrame(500);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(prompt.confirmButton.style.getPropertyValue('--next-episode-progress')).toBe('0.5');

    flushFrame(1000);
    expect(onConfirm).toHaveBeenCalledWith(next, { auto: true });
    expect(prompt.element.hidden).toBe(true);

    prompt.destroy();
  });

  it('ist per Escape schließbar und ruft onDismiss auf, unabhängig vom Fokus', () => {
    const onDismiss = vi.fn();
    const prompt = createNextEpisodePrompt({ root, onConfirm: vi.fn(), onDismiss });
    prompt.show(makeNext());
    document.body.focus();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onDismiss).toHaveBeenCalled();
    expect(prompt.element.hidden).toBe(true);
    prompt.destroy();
  });

  it('ignoriert Escape, wenn das Overlay bereits versteckt ist', () => {
    const onDismiss = vi.fn();
    const prompt = createNextEpisodePrompt({ root, onConfirm: vi.fn(), onDismiss });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(onDismiss).not.toHaveBeenCalled();
    prompt.destroy();
  });

  it('verschiebt den Fokus auf Bestätigen, wenn die letzte Eingabe per Tastatur kam', () => {
    const prompt = createNextEpisodePrompt({ root, onConfirm: vi.fn(), onDismiss: vi.fn() });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

    prompt.show(makeNext());

    expect(document.activeElement).toBe(prompt.confirmButton);
    prompt.destroy();
  });

  it('verschiebt den Fokus nicht, wenn keine Buttons sichtbar sind', () => {
    const prompt = createNextEpisodePrompt({ root, onConfirm: vi.fn(), onDismiss: vi.fn() });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

    prompt.show(makeNext(), { controls: false });

    expect(prompt.element.contains(document.activeElement)).toBe(false);
    prompt.destroy();
  });

  it('verschiebt den Fokus nicht, wenn die letzte Eingabe per Maus kam', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    const prompt = createNextEpisodePrompt({ root, onConfirm: vi.fn(), onDismiss: vi.fn() });
    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    prompt.show(makeNext());

    expect(document.activeElement).toBe(button);
    prompt.destroy();
    button.remove();
  });

  it('gibt den Fokus beim Schließen an das vorher fokussierte Element zurück', () => {
    const playerButton = document.createElement('button');
    document.body.appendChild(playerButton);
    playerButton.focus();

    const prompt = createNextEpisodePrompt({ root, onConfirm: vi.fn(), onDismiss: vi.fn() });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

    prompt.show(makeNext());
    expect(document.activeElement).toBe(prompt.confirmButton);

    prompt.dismissButton.click();

    expect(document.activeElement).toBe(playerButton);
    prompt.destroy();
    playerButton.remove();
  });

  it('zeigt Zuschauern Countdown und Info, aber keine Buttons, und meldet das Ablaufen', () => {
    const onConfirm = vi.fn();
    const prompt = createNextEpisodePrompt({ root, onConfirm, onDismiss: vi.fn(), countdownMs: 1000 });
    prompt.show(makeNext(), { controls: false, message: 'Nur Admins' });

    expect(prompt.confirmButton.hidden).toBe(true);
    expect(prompt.dismissButton.hidden).toBe(true);
    expect(prompt.element.textContent).toContain('Nur Admins');
    expect(prompt.element.textContent).toContain('Startet in 1 s');

    prompt.confirmButton.click();
    expect(onConfirm).not.toHaveBeenCalled();

    flushFrame(2000);
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ kind: 'next-episode' }), { auto: true });
    expect(prompt.element.hidden).toBe(true);

    prompt.destroy();
  });

  it('meldet einen Klick als manuellen Start und kann Buttons nachträglich freigeben', () => {
    const onConfirm = vi.fn();
    const prompt = createNextEpisodePrompt({ root, onConfirm, onDismiss: vi.fn(), countdownMs: 1000 });
    prompt.show(makeNext(), { controls: false });
    prompt.setControls(true);
    expect(prompt.confirmButton.hidden).toBe(false);
    expect(prompt.dismissButton.hidden).toBe(false);

    prompt.confirmButton.click();
    expect(onConfirm).toHaveBeenCalledWith(expect.anything(), { auto: false });
    prompt.destroy();
  });

  it('Tab erreicht sowohl Bestätigen als auch Abbrechen', () => {
    const prompt = createNextEpisodePrompt({ root, onConfirm: vi.fn(), onDismiss: vi.fn() });
    prompt.show(makeNext());

    expect(prompt.confirmButton.tabIndex).not.toBe(-1);
    expect(prompt.dismissButton.tabIndex).not.toBe(-1);
    expect(prompt.confirmButton.disabled).toBeFalsy();
    expect(prompt.dismissButton.disabled).toBeFalsy();

    prompt.destroy();
  });

  it('destroy räumt Timer auf und entfernt das Element', () => {
    const onConfirm = vi.fn();
    const prompt = createNextEpisodePrompt({ root, onConfirm, onDismiss: vi.fn(), countdownMs: 1000 });
    prompt.show(makeNext());

    prompt.destroy();
    expect(root.contains(prompt.element)).toBe(false);

    flushFrame(1000);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('createNextEpisodePrompt – Countdown auf Medienzeit', () => {
  let root;
  let rafCallbacks;
  let mediaTime;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);

    mediaTime = 0;
    rafCallbacks = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    root.remove();
  });

  function advanceTo(seconds) {
    mediaTime = seconds;
    rafCallbacks.splice(0).forEach(cb => cb(0));
  }

  function showWithSkip(prompt, next, { skipAt = 100, from = 75 } = {}) {
    mediaTime = from;
    prompt.show(next, { skipAt, getCurrentTime: () => mediaTime });
  }

  function countdownText(prompt) {
    return prompt.element.querySelector('.vanta-player-next-episode-countdown');
  }

  it('zählt entlang der Medienzeit herunter und bestätigt beim Erreichen von skipAt', () => {
    const onConfirm = vi.fn();
    const prompt = createNextEpisodePrompt({ root, onConfirm, onDismiss: vi.fn() });
    const next = makeNext();
    showWithSkip(prompt, next);

    expect(countdownText(prompt).hidden).toBe(false);
    expect(countdownText(prompt).textContent).toBe('Startet in 25 s');

    advanceTo(87.5);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(prompt.confirmButton.style.getPropertyValue('--next-episode-progress')).toBe('0.5');
    expect(countdownText(prompt).textContent).toBe('Startet in 13 s');

    advanceTo(100);
    expect(onConfirm).toHaveBeenCalledWith(next, { auto: true });
    expect(prompt.element.hidden).toBe(true);

    prompt.destroy();
  });

  it('hält den Countdown an, solange die Medienzeit stehen bleibt (Pause)', () => {
    const onConfirm = vi.fn();
    const prompt = createNextEpisodePrompt({ root, onConfirm, onDismiss: vi.fn() });
    showWithSkip(prompt, makeNext());

    for (let i = 0; i < 20; i += 1) advanceTo(75);

    expect(onConfirm).not.toHaveBeenCalled();
    expect(prompt.element.hidden).toBe(false);
    expect(countdownText(prompt).textContent).toBe('Startet in 25 s');

    prompt.destroy();
  });

  it('schiebt den Skip nach hinten, wenn zurückgespult wird', () => {
    const onConfirm = vi.fn();
    const prompt = createNextEpisodePrompt({ root, onConfirm, onDismiss: vi.fn() });
    showWithSkip(prompt, makeNext());

    advanceTo(40);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(prompt.confirmButton.style.getPropertyValue('--next-episode-progress')).toBe('0');
    expect(countdownText(prompt).textContent).toBe('Startet in 60 s');

    advanceTo(100);
    expect(onConfirm).toHaveBeenCalled();

    prompt.destroy();
  });

  it('startet keinen Countdown, wenn bereits hinter skipAt eingestiegen wird', () => {
    const onConfirm = vi.fn();
    const prompt = createNextEpisodePrompt({ root, onConfirm, onDismiss: vi.fn() });
    showWithSkip(prompt, makeNext(), { skipAt: 100, from: 101 });

    expect(rafCallbacks).toHaveLength(0);
    expect(countdownText(prompt).hidden).toBe(true);

    advanceTo(200);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(prompt.element.hidden).toBe(false);

    prompt.destroy();
  });

  it('blendet den Countdown beim Schließen wieder aus', () => {
    const prompt = createNextEpisodePrompt({ root, onConfirm: vi.fn(), onDismiss: vi.fn() });
    showWithSkip(prompt, makeNext());
    expect(countdownText(prompt).hidden).toBe(false);

    prompt.dismissButton.click();
    expect(countdownText(prompt).hidden).toBe(true);

    prompt.destroy();
  });

  it('fällt ohne skipAt auf den Wanduhr-Countdown zurück', () => {
    const onConfirm = vi.fn();
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    const prompt = createNextEpisodePrompt({ root, onConfirm, onDismiss: vi.fn(), countdownMs: 1000 });
    prompt.show(makeNext());
    expect(countdownText(prompt).textContent).toBe('Startet in 1 s');

    now = 1000;
    rafCallbacks.splice(0).forEach(cb => cb(now));
    expect(onConfirm).toHaveBeenCalled();

    prompt.destroy();
  });
});
