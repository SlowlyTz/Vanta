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
  for (let i = 0; i < 4; i++) await Promise.resolve();
}

const yes = vi.fn().mockResolvedValue(true);

describe('createPlayedToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    yes.mockResolvedValue(true);
    document.body.innerHTML = '';
  });

  it('is an icon-only button that reflects the initial Played state', () => {
    const played = createPlayedToggle({ Id: 'e1', UserData: { Played: true } });
    expect(played.getAttribute('aria-pressed')).toBe('true');
    expect(played.textContent.trim()).toBe('');
    expect(played.querySelector('svg')).toBeTruthy();
    expect(played.getAttribute('aria-label')).toBe('Als ungesehen markieren');

    const unplayed = createPlayedToggle({ Id: 'e2', UserData: { Played: false } }, { compact: true });
    expect(unplayed.getAttribute('aria-pressed')).toBe('false');
    expect(unplayed.classList.contains('compact')).toBe(true);
    expect(unplayed.getAttribute('aria-label')).toBe('Als gesehen markieren');
  });

  it('asks before marking and words the question for the item type', async () => {
    const movie = createPlayedToggle({ Id: 'm1', Type: 'Movie', UserData: { Played: false } }, { confirm: yes });
    movie.click();
    await flush();
    expect(yes).toHaveBeenLastCalledWith({ title: 'Film als gesehen markieren?', message: 'Willst du diesen Film als gesehen markieren?' });

    const episode = createPlayedToggle({ Id: 'e1', Type: 'Episode', UserData: { Played: true } }, { confirm: yes });
    episode.click();
    await flush();
    expect(yes).toHaveBeenLastCalledWith({ title: 'Folge als ungesehen markieren?', message: 'Willst du diese Folge als ungesehen markieren?' });
  });

  it('does nothing when the question is answered with no', async () => {
    const no = vi.fn().mockResolvedValue(false);
    const item = { Id: 'm1', Type: 'Movie', UserData: { Played: false } };
    const toggle = createPlayedToggle(item, { confirm: no });

    toggle.click();
    await flush();

    expect(MediaApi.markPlayed).not.toHaveBeenCalled();
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(item.UserData.Played).toBe(false);
  });

  it('marks played after yes, syncs with Jellyfin and resets the position', async () => {
    MediaApi.markPlayed.mockResolvedValue({ played: true });
    const item = { Id: 'e1', Type: 'Episode', UserData: { Played: false, PlaybackPositionTicks: 500 } };
    const onChange = vi.fn();
    const toggle = createPlayedToggle(item, { onChange, confirm: yes });

    toggle.click();
    await flush();

    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(item.UserData.Played).toBe(true);
    expect(item.UserData.PlaybackPositionTicks).toBe(0);
    expect(MediaApi.markPlayed).toHaveBeenCalledWith('e1');
    expect(onChange).toHaveBeenCalledWith(true);
    expect(appStore.showToast).toHaveBeenCalledWith('Als gesehen markiert', 'success');
  });

  it('marks unplayed through the DELETE call', async () => {
    MediaApi.markUnplayed.mockResolvedValue({ played: false });
    const toggle = createPlayedToggle({ Id: 'e1', UserData: { Played: true } }, { confirm: yes });

    toggle.click();
    await flush();

    expect(MediaApi.markUnplayed).toHaveBeenCalledWith('e1');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('reverts when the request fails', async () => {
    MediaApi.markPlayed.mockRejectedValue(new Error('nope'));
    const item = { Id: 'e1', UserData: { Played: false } };
    const toggle = createPlayedToggle(item, { confirm: yes });

    toggle.click();
    await flush();

    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(item.UserData.Played).toBe(false);
    expect(appStore.showToast).toHaveBeenCalledWith('Status konnte nicht aktualisiert werden', 'error');
  });

  it('opens the real yes/no dialog by default and does not bubble the click to the card', async () => {
    MediaApi.markPlayed.mockResolvedValue({ played: true });
    const parentClick = vi.fn();
    const parent = document.createElement('div');
    parent.addEventListener('click', parentClick);
    const toggle = createPlayedToggle({ Id: 'e1', Type: 'Movie', UserData: {} }, { compact: true });
    parent.appendChild(toggle);
    document.body.appendChild(parent);

    toggle.click();
    expect(parentClick).not.toHaveBeenCalled();
    const dialog = document.querySelector('.confirm-dialog');
    expect(dialog.textContent).toContain('Willst du diesen Film als gesehen markieren?');
    expect(dialog.querySelector('.confirm-dialog-confirm').textContent).toBe('Ja');
    expect(dialog.querySelector('.confirm-dialog-cancel').textContent).toBe('Nein');

    dialog.querySelector('.confirm-dialog-confirm').click();
    await flush();
    expect(document.querySelector('.confirm-dialog')).toBeNull();
    expect(MediaApi.markPlayed).toHaveBeenCalledWith('e1');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});
