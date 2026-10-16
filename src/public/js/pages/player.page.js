import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { loadEpisodeContext } from '../utils/episodeContext.js';
import { router } from '../router.js';
import { PLAYER_MODULE_URL, playerMediaOptions } from '../utils/playerMedia.js';
import { resolvePageScope } from '../utils/pageScope.js';
import { preferencesStore } from '../store/preferences.store.js';
import { createPlayerCarry, sleepForNextEpisode } from '../utils/playerCarry.js';

// `#/item/<id>` (also with a query) names the detail page playback started from.
const originItemId = (hash) => /^#\/item\/([^/?]+)/.exec(hash || '')?.[1] || null;

export default function PlayerPage({ id }, pageScope) {
  const scope = resolvePageScope(pageScope);
  const container = createElement('div', {
    className: 'player-page vanta-player-root'
  });

  let controller = null;
  let playableId = id;
  let cleaningUp = false;
  const mountAbort = new AbortController();
  let scrollLockY = 0;
  // Carried over to the next episode: playback without input so far (so
  // "Schaust du noch?" also comes during a long autoplay chain), the sleep
  // timer, and the detail page playback was started from.
  const playerCarry = createPlayerCarry();
  const carried = playerCarry.take();
  let idleMs = carried.idleMs || 0;
  let sleepState = carried.sleep || null;
  const previousItemId = originItemId(router.previousHash);
  const originId = carried.originId || previousItemId || id;
  // Came straight from that detail page: it is the history entry below this
  // one (episode switches replace the entry), so going back lands there.
  const originInHistory = carried.originId ? Boolean(carried.originInHistory) : Boolean(previousItemId);

  const handleTouchMove = event => {
    if (event.target.closest('media-player, button')) return;
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

  const cleanup = async () => {
    if (cleaningUp) return;
    cleaningUp = true;
    window.removeEventListener('hashchange', handleHashChange);
    // A player still loading its first source has no controller yet.
    mountAbort.abort();
    // The page below scrolls again at once; the stop report (with retries)
    // must not hold it for seconds.
    unlockViewport();
    try {
      await controller?.destroy();
    } catch (error) {
      console.warn('[Player Cleanup]', error);
    }
  };

  const goBack = () => {
    cleanup();
    window.history.back();
  };

  // Replaces the current history entry instead of pushing a new one, so switching
  // episodes in-player doesn't leave a trail of stale player entries that "Zurück"
  // would have to click through before reaching the series page.
  const navigateToEpisode = (episodeId, { manual = false } = {}) => {
    playerCarry.give({ idleMs, sleep: sleepForNextEpisode(sleepState, { manual }), originId, originInHistory });
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}#/player/${episodeId}`
    );
    router.handleRoute();
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

  const showBootstrapError = error => {
    container.innerHTML = '';
    const isStreamLimitError = error.code === 'STREAM_LIMIT_REACHED';
    const title = isStreamLimitError ? 'Stream-Limit erreicht' : 'Ladefehler';
    // The server's limit message names the device holding the slot.
    const message = error.message
      || (isStreamLimitError ? 'Stream-Limit erreicht. Beende einen anderen Stream und versuche es erneut.' : 'Der Player konnte nicht geladen werden.');

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

      // "Von vorn" (#/player/<id>?from=start) ignores the saved position.
      const fromStart = new URLSearchParams(window.location.hash.split('?')[1] || '').get('from') === 'start';
      const resumePosition = fromStart ? 0 : Number(item.UserData?.PlaybackPositionTicks || 0) / 10_000_000;
      const episodeContext = await loadEpisodeContext(item).catch(() => null);
      if (cleaningUp) return;

      controller = await playerModule.mountVantaPlayer({
        root: container,
        ...playerMediaOptions(item, playableId, {
          leave: () => {
            cleanup();
            window.location.hash = '#/home';
          }
        }),
        resumePosition,
        signal: mountAbort.signal,
        onBack: goBack,
        userPreferences: preferencesStore.getState(),
        tvMode: document.documentElement.classList.contains('tv-mode'),
        onUserPreferenceChange: patch => { preferencesStore.update(patch).catch(() => {}); },
        stillWatching: {
          afterMs: preferencesStore.get('stillWatchingHours') * 60 * 60 * 1000,
          initialIdleMs: idleMs,
          onIdleChange: value => { idleMs = value; }
        },
        sleepTimer: {
          initial: sleepState,
          onChange: state => { sleepState = state.mode === 'off' ? null : state; }
        },
        // The sleep timer ran out: stop and show the title playback started from.
        onSleep: async () => {
          await cleanup();
          if (originInHistory) window.history.back();
          else window.location.replace(`#/item/${originId}`);
        },
        episodeBrowser: episodeContext ? {
          enabled: true,
          context: episodeContext,
          readonly: false,
          onSelectEpisode: async episode => {
            await cleanup();
            navigateToEpisode(episode.Id, { manual: true });
          },
          onNextEpisode: async ({ episode }) => {
            await cleanup();
            navigateToEpisode(episode.Id);
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
  // The hash change stops playback at once; leaving the page (also to
  // another episode, which stays on #/player) is the guarantee.
  window.addEventListener('hashchange', handleHashChange);
  scope.onLeave(cleanup);
  initialize();

  return container;
}
