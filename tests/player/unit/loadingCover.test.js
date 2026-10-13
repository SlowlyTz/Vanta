import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLoadingCover, COVER_FADE_MS } from '../../../src/player/src/player/loadingCover.js';

const setup = () => {
  document.body.innerHTML = `
    <div class="vanta-player-loading"><span class="vanta-player-loading-status">Wiedergabequelle wird angefragt …</span></div>`;
  const dom = {
    loading: document.querySelector('.vanta-player-loading'),
    loadingStatus: document.querySelector('.vanta-player-loading-status')
  };
  const indicator = { setCoverVisible: vi.fn() };
  const cover = createLoadingCover({ dom, getLoadIndicator: () => indicator });
  return { dom, indicator, cover };
};

describe('createLoadingCover', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('resets the status line once a finished start has faded out', () => {
    const { dom, indicator, cover } = setup();
    cover.setVisible(true, 'Video wird geladen …');
    cover.setStatus('Erstes HLS-Segment wird transkodiert und geladen …');
    cover.setVisible(false);

    expect(dom.loading.classList.contains('is-hidden')).toBe(true);
    expect(indicator.setCoverVisible).toHaveBeenLastCalledWith(false);
    // Still shown while the cover fades.
    expect(dom.loadingStatus.textContent).toBe('Erstes HLS-Segment wird transkodiert und geladen …');

    vi.advanceTimersByTime(COVER_FADE_MS);
    expect(dom.loadingStatus.textContent).toBe('Wiedergabequelle wird angefragt …');
  });

  it('keeps the new status when the cover comes back during the fade', () => {
    const { dom, cover } = setup();
    cover.setVisible(false);
    cover.setVisible(true, 'Qualität wird gewechselt …');
    vi.advanceTimersByTime(COVER_FADE_MS * 2);

    expect(dom.loading.classList.contains('is-hidden')).toBe(false);
    expect(dom.loadingStatus.textContent).toBe('Qualität wird gewechselt …');
  });

  it('ignores an empty status and stops its timer on dispose', () => {
    const { dom, cover } = setup();
    cover.setStatus('');
    expect(dom.loadingStatus.textContent).toBe('Wiedergabequelle wird angefragt …');
    cover.setStatus('Schritt');
    cover.setVisible(false);
    cover.dispose();
    vi.advanceTimersByTime(COVER_FADE_MS);
    expect(dom.loadingStatus.textContent).toBe('Schritt');
  });
});

describe('createLoadingCover problems', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setupWithProblem = (options = {}) => {
    document.body.innerHTML = `
      <div class="vanta-player-loading">
        <span class="vanta-player-loading-label">Video wird vorbereitet</span>
        <span class="vanta-player-loading-status">HLS-Wiedergabe wird initialisiert …</span>
        <div class="vanta-player-loading-problem" hidden>
          <p class="vanta-player-loading-problem-text"></p>
          <button class="vanta-player-loading-retry"></button><button class="vanta-player-loading-leave"></button>
        </div>
      </div>`;
    const q = selector => document.querySelector(selector);
    const dom = {
      loading: q('.vanta-player-loading'), loadingStatus: q('.vanta-player-loading-status'), loadingLabel: q('.vanta-player-loading-label'),
      loadingProblem: q('.vanta-player-loading-problem'), loadingProblemText: q('.vanta-player-loading-problem-text'),
      loadingRetry: q('.vanta-player-loading-retry'), loadingLeave: q('.vanta-player-loading-leave')
    };
    const onRetry = vi.fn();
    const onLeave = vi.fn();
    const cover = createLoadingCover({ dom, onRetry, onLeave, watchdogMs: 1000, ...options });
    return { dom, cover, onRetry, onLeave };
  };

  it('says why a start fails instead of loading forever, with a way on', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { dom, cover, onRetry, onLeave } = setupWithProblem();
    cover.showProblem('Stream-Limit erreicht', { fatal: true });
    expect(dom.loadingProblem.hidden).toBe(false);
    expect(dom.loadingProblemText.textContent).toBe('Stream-Limit erreicht');
    expect(dom.loadingLabel.textContent).toBe('Wiedergabe konnte nicht starten');
    expect(dom.loading.classList.contains('is-failed')).toBe(true);
    dom.loadingRetry.click();
    dom.loadingLeave.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('speaks up when no picture comes for too long and clears once playback starts', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { dom, cover } = setupWithProblem();
    vi.advanceTimersByTime(1000);
    expect(dom.loadingProblem.hidden).toBe(false);
    expect(dom.loadingProblemText.textContent).toContain('HLS-Wiedergabe wird initialisiert');
    expect(dom.loading.classList.contains('is-failed')).toBe(false);
    cover.setVisible(false);
    expect(dom.loadingProblem.hidden).toBe(true);
    expect(dom.loadingLabel.textContent).toBe('Video wird vorbereitet');
  });
});
