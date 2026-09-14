import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaApi } from '../../../src/public/js/api/media.api.js';
import { appStore } from '../../../src/public/js/store/app.store.js';
import { createPlayedToggle } from '../../../src/public/js/components/playedToggle.js';

vi.mock('../../../src/public/js/api/media.api.js', () => ({
  MediaApi: { markPlayed: vi.fn(), markUnplayed: vi.fn() }
}));

vi.mock('../../../src/public/js/store/app.store.js', () => ({
  appStore: { showToast: vi.fn() }
}));

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('createPlayedToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reflects the initial Played state with a label and aria-pressed', () => {
    const played = createPlayedToggle({ Id: 'e1', UserData: { Played: true } });
    expect(played.getAttribute('aria-pressed')).toBe('true');
    expect(played.textContent).toContain('Gesehen');
    expect(played.getAttribute('aria-label')).toBe('Als ungesehen markieren');

    const unplayed = createPlayedToggle({ Id: 'e2', UserData: { Played: false } });
    expect(unplayed.getAttribute('aria-pressed')).toBe('false');
    expect(unplayed.textContent).toContain('Als gesehen markieren');
  });

  it('is icon-only in compact mode but keeps its accessible name', () => {
    const toggle = createPlayedToggle({ Id: 'e1', UserData: {} }, { compact: true });
    expect(toggle.classList.contains('compact')).toBe(true);
    expect(toggle.querySelector('.played-toggle-label')).toBeNull();
    expect(toggle.getAttribute('aria-label')).toBe('Als gesehen markieren');
  });

  it('marks played optimistically, syncs with Jellyfin and resets the position', async () => {
    MediaApi.markPlayed.mockResolvedValue({ played: true });
    const item = { Id: 'e1', UserData: { Played: false, PlaybackPositionTicks: 500 } };
    const onChange = vi.fn();
    const toggle = createPlayedToggle(item, { onChange });

    toggle.click();
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(item.UserData.Played).toBe(true);
    expect(item.UserData.PlaybackPositionTicks).toBe(0);

    await flush();
    expect(MediaApi.markPlayed).toHaveBeenCalledWith('e1');
    expect(onChange).toHaveBeenCalledWith(true);
    expect(appStore.showToast).toHaveBeenCalledWith('Als gesehen markiert', 'success');
  });

  it('marks unplayed through the DELETE call', async () => {
    MediaApi.markUnplayed.mockResolvedValue({ played: false });
    const toggle = createPlayedToggle({ Id: 'e1', UserData: { Played: true } });

    toggle.click();
    await flush();

    expect(MediaApi.markUnplayed).toHaveBeenCalledWith('e1');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('reverts when the request fails', async () => {
    MediaApi.markPlayed.mockRejectedValue(new Error('nope'));
    const item = { Id: 'e1', UserData: { Played: false } };
    const toggle = createPlayedToggle(item);

    toggle.click();
    await flush();

    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(item.UserData.Played).toBe(false);
    expect(appStore.showToast).toHaveBeenCalledWith('Status konnte nicht aktualisiert werden', 'error');
  });

  it('does not bubble the click to the card behind it', () => {
    const parentClick = vi.fn();
    const parent = document.createElement('div');
    parent.addEventListener('click', parentClick);
    const toggle = createPlayedToggle({ Id: 'e1', UserData: {} }, { compact: true });
    parent.appendChild(toggle);

    toggle.click();
    expect(parentClick).not.toHaveBeenCalled();
  });
});
