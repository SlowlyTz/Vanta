import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createNextEpisodePrompt } from '../../src/nextEpisodePrompt.js';

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

    expect(onConfirm).toHaveBeenCalledWith(next);
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
    expect(onConfirm).toHaveBeenCalledWith(next);
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

  it('verschiebt den Fokus auf Abbrechen, wenn nicht-interaktiv und letzte Eingabe Tastatur war', () => {
    const prompt = createNextEpisodePrompt({ root, onConfirm: vi.fn(), onDismiss: vi.fn() });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));

    prompt.show(makeNext(), { interactive: false });

    expect(document.activeElement).toBe(prompt.dismissButton);
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

  it('zeigt im nicht-interaktiven Modus nur eine Info ohne Bestätigen-Button', () => {
    const onConfirm = vi.fn();
    const prompt = createNextEpisodePrompt({ root, onConfirm, onDismiss: vi.fn(), countdownMs: 1000 });
    prompt.show(makeNext(), { interactive: false, message: 'Warten auf Admin' });

    expect(prompt.confirmButton.hidden).toBe(true);
    expect(prompt.element.textContent).toContain('Warten auf Admin');

    flushFrame(2000);
    expect(onConfirm).not.toHaveBeenCalled();

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
