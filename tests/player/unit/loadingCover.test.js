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
