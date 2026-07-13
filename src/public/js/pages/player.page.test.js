import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MediaApi } from '../api/media.api.js';
import PlayerPage from './player.page.js';

const PLAYER_MODULE_URL = '/vendor/player/vanta-player.js';

vi.mock('../api/media.api.js', () => ({
  MediaApi: {
    getItem: vi.fn(),
    getSeasons: vi.fn(),
    getEpisodes: vi.fn(),
    getImageUrl: vi.fn().mockReturnValue('poster.jpg'),
    getPlayback: vi.fn(),
    reportPlayback: vi.fn()
  }
}));

vi.mock('/vendor/player/vanta-player.js', () => ({
  mountVantaPlayer: vi.fn().mockResolvedValue({ destroy: vi.fn() })
}));

vi.mock('../router.js', () => ({
  router: { handleRoute: vi.fn() }
}));

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('PlayerPage bootstrap errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    document.documentElement.classList.remove('player-active');
    document.body.classList.remove('player-active');
  });

  it('shows a dedicated stream-limit message for a STREAM_LIMIT_REACHED failure', async () => {
    const limitError = new Error('Stream-Limit erreicht. Maximal erlaubt: 1');
    limitError.status = 429;
    limitError.code = 'STREAM_LIMIT_REACHED';
    MediaApi.getItem.mockRejectedValue(limitError);

    const container = PlayerPage({ id: 'item-1' });
    await flush();

    const overlay = container.querySelector('.vanta-player-bootstrap-error');
    expect(overlay).toBeTruthy();
    expect(overlay.classList.contains('vanta-player-stream-limit-error')).toBe(true);
    expect(container.querySelector('.vanta-player-bootstrap-error-title').textContent).toBe('Stream-Limit erreicht');
    expect(container.querySelector('.vanta-player-bootstrap-error-msg').textContent)
      .toBe('Stream-Limit erreicht. Beende einen anderen Stream und versuche es erneut.');
  });

  it('keeps the generic bootstrap error message for unrelated playback failures', async () => {
    MediaApi.getItem.mockRejectedValue(new Error('Netzwerkfehler'));

    const container = PlayerPage({ id: 'item-1' });
    await flush();

    const overlay = container.querySelector('.vanta-player-bootstrap-error');
    expect(overlay.classList.contains('vanta-player-stream-limit-error')).toBe(false);
    expect(container.querySelector('.vanta-player-bootstrap-error-title').textContent).toBe('Ladefehler');
    expect(container.querySelector('.vanta-player-bootstrap-error-msg').textContent).toBe('Netzwerkfehler');
  });
});

describe('PlayerPage episode navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = '';
  });

  afterEach(() => {
    document.documentElement.classList.remove('player-active');
    document.body.classList.remove('player-active');
    window.location.hash = '';
  });

  it('navigiert zur nächsten Folge, wenn das Overlay onNextEpisode auslöst, ohne einen neuen History-Eintrag zu erzeugen', async () => {
    const { mountVantaPlayer } = await import(PLAYER_MODULE_URL);
    const { router } = await import('../router.js');
    const destroy = vi.fn().mockResolvedValue(undefined);
    mountVantaPlayer.mockResolvedValueOnce({ destroy });

    MediaApi.getItem.mockResolvedValue({
      Id: 'ep-1',
      Type: 'Episode',
      SeriesId: 'series-1',
      Name: 'Folge 1',
      UserData: {}
    });
    MediaApi.getSeasons.mockResolvedValue([{ Id: 'season-1', Name: 'Staffel 1', IndexNumber: 1 }]);
    MediaApi.getEpisodes.mockResolvedValue([
      { Id: 'ep-1', Name: 'Folge 1', ParentIndexNumber: 1, IndexNumber: 1 },
      { Id: 'ep-2', Name: 'Folge 2', ParentIndexNumber: 1, IndexNumber: 2 }
    ]);

    PlayerPage({ id: 'ep-1' });
    await new Promise(resolve => setTimeout(resolve, 0));
    await flush();

    const mountCall = mountVantaPlayer.mock.calls.at(-1)[0];
    expect(mountCall.episodeBrowser.enabled).toBe(true);

    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
    const pushStateSpy = vi.spyOn(window.history, 'pushState');

    await mountCall.episodeBrowser.onNextEpisode({ episode: { Id: 'ep-2' } });

    expect(destroy).toHaveBeenCalled();
    expect(window.location.hash).toBe('#/player/ep-2');
    expect(replaceStateSpy).toHaveBeenCalled();
    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(router.handleRoute).toHaveBeenCalled();

    replaceStateSpy.mockRestore();
    pushStateSpy.mockRestore();
  });
});

describe('PlayerPage viewport lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MediaApi.getItem.mockResolvedValue({ Id: 'item-1', Type: 'Movie', Name: 'Test Movie', UserData: {} });
  });

  afterEach(() => {
    document.documentElement.classList.remove('player-active');
    document.body.classList.remove('player-active');
    document.body.style.top = '';
    window.scrollTo = undefined;
  });

  it('never applies a negative body top offset, even when the previous page was scrolled', async () => {
    window.scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollY', { value: 800, configurable: true });

    PlayerPage({ id: 'item-1' });

    expect(document.documentElement.classList.contains('player-active')).toBe(true);
    expect(document.body.classList.contains('player-active')).toBe(true);
    expect(document.body.style.top).toBe('');

    await flush();
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
  });

  it('restores the previous scroll position and removes the lock classes on cleanup', async () => {
    window.scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollY', { value: 450, configurable: true });

    const container = PlayerPage({ id: 'item-1' });
    await flush();

    window.dispatchEvent(Object.assign(new Event('hashchange'), {}));
    window.location.hash = '#/home';
    window.dispatchEvent(new Event('hashchange'));
    await flush();

    expect(document.documentElement.classList.contains('player-active')).toBe(false);
    expect(document.body.classList.contains('player-active')).toBe(false);
    expect(window.scrollTo).toHaveBeenCalledWith(0, 450);

    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    void container;
  });
});
