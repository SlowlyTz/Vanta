import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { loadEpisodeContext } from '../utils/episodeContext.js';

const PLAYER_MODULE_URL = '/vendor/player/vanta-player.js';

export default function PlayerPage({ id }) {
  const container = createElement('div', {
    className: 'player-page vanta-player-root'
  });

  let controller = null;
  let playableId = id;
  let cleaningUp = false;
  let scrollLockY = 0;

  const handleTouchMove = event => {
    if (event.target.closest('media-player, button, .vanta-player-menu, .vanta-player-error')) return;
    event.preventDefault();
  };

  const lockViewport = () => {
    scrollLockY = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.classList.add('player-active');
    document.body.classList.add('player-active');
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
  };

  const unlockViewport = () => {
    window.removeEventListener('touchmove', handleTouchMove);
    document.documentElement.classList.remove('player-active');
    document.body.classList.remove('player-active');
    document.body.style.cursor = 'default';
    window.scrollTo(0, scrollLockY);
  };

  const cleanup = () => {
    if (cleaningUp) return;
    cleaningUp = true;
    window.removeEventListener('hashchange', handleHashChange);
    try {
      controller?.destroy();
    } catch (error) {
      console.warn('[Player Cleanup]', error);
    }
    unlockViewport();
  };

  const goBack = () => {
    cleanup();
    window.history.back();
  };

  function handleHashChange() {
    if (!window.location.hash.startsWith('#/player')) cleanup();
  }

  const resolvePlayableItem = async () => {
    let item = await MediaApi.getItem(id);

    if (item.Type === 'Series') {
      const seasons = await MediaApi.getSeasons(id);
      if (!seasons?.length) throw new Error('Keine Staffeln für diese Serie gefunden.');
      const episodes = await MediaApi.getEpisodes(id, seasons[0].Id);
      if (!episodes?.length) throw new Error('Keine Episoden in der ersten Staffel gefunden.');
      const nextEpisode = episodes.find(episode => episode.UserData && !episode.UserData.Played);
      playableId = (nextEpisode || episodes[0]).Id;
      item = await MediaApi.getItem(playableId);
    } else if (item.Type === 'Season') {
      if (!item.SeriesId) throw new Error('Hauptserien-ID konnte nicht ermittelt werden.');
      const episodes = await MediaApi.getEpisodes(item.SeriesId, id);
      if (!episodes?.length) throw new Error('Keine Episoden in dieser Staffel gefunden.');
      const nextEpisode = episodes.find(episode => episode.UserData && !episode.UserData.Played);
      playableId = (nextEpisode || episodes[0]).Id;
      item = await MediaApi.getItem(playableId);
    }

    return item;
  };

  const getPosterUrl = item => {
    const imageOwnerId = item.ParentBackdropItemId || item.Id || playableId;
    const tag = item.ParentBackdropImageTags?.[0] || item.BackdropImageTags?.[0];
    return MediaApi.getImageUrl(imageOwnerId, 'Backdrop', 1920, {
      tag,
      quality: 90
    });
  };

  const showBootstrapError = error => {
    container.innerHTML = '';
    const isStreamLimitError = error.code === 'STREAM_LIMIT_REACHED';
    const title = isStreamLimitError ? 'Stream-Limit erreicht' : 'Ladefehler';
    const message = isStreamLimitError
      ? 'Stream-Limit erreicht. Beende einen anderen Stream und versuche es erneut.'
      : (error.message || 'Der Player konnte nicht geladen werden.');

    const overlay = createElement('div', {
      className: `vanta-player-bootstrap-error${isStreamLimitError ? ' vanta-player-stream-limit-error' : ''}`
    },
      createElement('div', { className: 'vanta-player-bootstrap-error-title' }, title),
      createElement('div', { className: 'vanta-player-bootstrap-error-msg' }, message)
    );
    const backButton = createElement('button', { className: 'btn-primary' }, 'Zurück');
    backButton.addEventListener('click', goBack);
    overlay.appendChild(backButton);
    container.appendChild(overlay);
  };

  const initialize = async () => {
    try {
      const [item, playerModule] = await Promise.all([
        resolvePlayableItem(),
        import(PLAYER_MODULE_URL)
      ]);
      if (cleaningUp) return;

      const resumePosition = Number(item.UserData?.PlaybackPositionTicks || 0) / 10_000_000;
      const episodeContext = await loadEpisodeContext(item).catch(() => null);
      if (cleaningUp) return;

      controller = await playerModule.mountVantaPlayer({
        root: container,
        itemId: playableId,
        title: item.Name || item.SeriesName || '',
        poster: getPosterUrl(item),
        resumePosition,
        resolvePlayback: (mode, options) => MediaApi.getPlayback(playableId, mode, options),
        reportPlayback: (event, payload, options) => MediaApi.reportPlayback(event, payload, options),
        onBack: goBack,
        episodeBrowser: episodeContext ? {
          enabled: true,
          context: episodeContext,
          readonly: false,
          onSelectEpisode: episode => {
            cleanup();
            window.location.hash = `#/player/${episode.Id}`;
          }
        } : null
      });

      if (cleaningUp) controller?.destroy();
    } catch (error) {
      console.error('[Player Initialisation Error]', error);
      if (!cleaningUp) showBootstrapError(error);
    }
  };

  lockViewport();
  window.addEventListener('hashchange', handleHashChange);
  initialize();

  return container;
}
