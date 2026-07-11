import { createElement } from '../utils/dom.js';
import { WatchPartyApi } from '../api/watch-party.api.js';
import { MediaApi } from '../api/media.api.js';
import { createWatchPartySocket } from '../realtime/watch-party.socket.js';
import { authStore } from '../store/auth.store.js';
import { appStore } from '../store/app.store.js';
import { loadEpisodeContext } from '../utils/episodeContext.js';

const PLAYER_MODULE_URL = '/vendor/player/vanta-player.js';
const OWNER_SYNC_INTERVAL_MS = 5000;

const PRELOAD_LABELS = {
  waiting: 'Wartet auf Player',
  loading: 'Stream wird vorbereitet …',
  ready: 'Bereit',
  blocked: 'Autoplay blockiert',
  error: 'Fehler beim Laden'
};

function memberInitial(username) {
  return (username || '?').trim().charAt(0).toUpperCase() || '?';
}

function getPosterUrl(item) {
  const imageOwnerId = item.ParentBackdropItemId || item.Id;
  const tag = item.ParentBackdropImageTags?.[0] || item.BackdropImageTags?.[0];
  return MediaApi.getImageUrl(imageOwnerId, 'Backdrop', 1920, { tag, quality: 90 });
}

export default function WatchPartyPage({ partyId }) {
  const container = createElement('div', { className: 'watch-party-page' });

  const currentUser = authStore.getState().user;

  let party = null;
  let socket = null;
  let controller = null;
  let ownerHeartbeatTimer = null;
  let countdownTimer = null;
  let destroyed = false;
  let scrollLockY = 0;
  let ending = false;

  const isOwner = () => Boolean(party && currentUser && party.ownerUserId === currentUser.id);

  // --- DOM ---
  const backButton = createElement('button', {
    className: 'watch-party-back',
    type: 'button',
    onClick: () => goHome()
  }, '← Zurück');

  const syncStatusBadge = createElement('span', {
    className: 'watch-party-sync-status',
    dataset: { status: 'preparing' }
  }, 'Wird vorbereitet');

  const endButton = createElement('button', {
    className: 'watch-party-end-button',
    type: 'button',
    hidden: true,
    onClick: () => handleEnd()
  }, 'Party beenden');

  const header = createElement('div', { className: 'watch-party-header' },
    backButton,
    createElement('h1', { className: 'watch-party-title' }, 'Watch Party'),
    syncStatusBadge,
    endButton
  );

  const mediaSummary = createElement('div', { className: 'watch-party-media-summary' });

  const inviteInput = createElement('input', {
    className: 'watch-party-invite-input',
    type: 'text',
    readonly: true,
    'aria-label': 'Invite-Link'
  });
  const copyButton = createElement('button', {
    className: 'watch-party-invite-copy',
    type: 'button',
    onClick: () => handleCopyInvite()
  }, 'Link kopieren');
  const inviteRow = createElement('div', { className: 'watch-party-invite' }, inviteInput, copyButton);

  const membersList = createElement('ul', { className: 'watch-party-members' });

  const startButton = createElement('button', {
    className: 'watch-party-start-button',
    type: 'button',
    hidden: true,
    onClick: () => handleStart()
  }, 'Party starten');

  const actionsRow = createElement('div', { className: 'watch-party-actions' }, startButton);

  const lobby = createElement('div', { className: 'watch-party-lobby' }, mediaSummary, inviteRow, membersList, actionsRow);

  const playerMount = createElement('div', { className: 'watch-party-player-mount' });

  const countdownOverlay = createElement('div', { className: 'watch-party-countdown-overlay', hidden: true });

  const autoplayActivateButton = createElement('button', {
    className: 'watch-party-autoplay-button',
    type: 'button'
  }, 'Wiedergabe aktivieren');
  const autoplayOverlay = createElement('div', { className: 'watch-party-autoplay-overlay', hidden: true },
    createElement('p', {}, 'Dein Browser hat die automatische Wiedergabe blockiert.'),
    autoplayActivateButton
  );

  const endedState = createElement('div', { className: 'watch-party-ended-state', hidden: true });
  const errorState = createElement('div', { className: 'watch-party-error', hidden: true });

  container.appendChild(header);
  container.appendChild(lobby);
  container.appendChild(countdownOverlay);
  container.appendChild(autoplayOverlay);
  container.appendChild(endedState);
  container.appendChild(errorState);

  // --- Lifecycle ---
  function goHome() {
    cleanup();
    window.location.hash = '#/home';
  }

  function cleanup() {
    if (destroyed) return;
    destroyed = true;
    window.removeEventListener('hashchange', handleHashChange);
    if (ownerHeartbeatTimer) window.clearInterval(ownerHeartbeatTimer);
    if (countdownTimer) window.clearInterval(countdownTimer);
    socket?.close();
    try {
      controller?.destroy();
    } catch (error) {
      console.warn('[Watch Party Cleanup]', error);
    }
    unlockPlayerViewport();
  }

  function handleHashChange() {
    if (!window.location.hash.startsWith(`#/watch-party/${partyId}`)) cleanup();
  }

  function lockPlayerViewport() {
    scrollLockY = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.classList.add('player-active');
    document.body.classList.add('player-active');
  }

  function unlockPlayerViewport() {
    document.documentElement.classList.remove('player-active');
    document.body.classList.remove('player-active');
    window.scrollTo(0, scrollLockY);
  }

  function setSyncStatus(status, label) {
    syncStatusBadge.dataset.status = status;
    syncStatusBadge.textContent = label;
  }

  // --- Rendering ---
  function renderMediaSummary() {
    mediaSummary.innerHTML = '';
    const snapshot = party.itemSnapshot || {};
    const subtitleParts = [];
    if (snapshot.seriesName) subtitleParts.push(snapshot.seriesName);
    if (snapshot.productionYear) subtitleParts.push(String(snapshot.productionYear));

    mediaSummary.appendChild(createElement('div', { className: 'watch-party-media-title' }, snapshot.name || 'Unbekanntes Medium'));
    if (subtitleParts.length) {
      mediaSummary.appendChild(createElement('div', { className: 'watch-party-media-subtitle' }, subtitleParts.join(' · ')));
    }
  }

  function preloadLabel(member) {
    return member.preloadMessage || PRELOAD_LABELS[member.preloadState] || PRELOAD_LABELS.waiting;
  }

  function renderMembers() {
    membersList.innerHTML = '';

    party.members.forEach(member => {
      const isSelf = member.userId === currentUser?.id;

      const row = createElement('li', { className: 'watch-party-member' },
        createElement('span', { className: 'watch-party-member-avatar' }, memberInitial(member.username)),
        createElement('span', { className: 'watch-party-member-name' },
          `${member.username}${isSelf ? ' (Du)' : ''}`,
          member.role === 'owner' ? createElement('span', { className: 'watch-party-member-badge' }, 'Owner') : null
        ),
        createElement('span', {
          className: `watch-party-member-status is-${member.preloadState || 'waiting'}`
        }, preloadLabel(member))
      );

      if (isOwner() && !isSelf) {
        row.appendChild(createElement('button', {
          className: 'watch-party-kick-button',
          type: 'button',
          'aria-label': `${member.username} entfernen`,
          onClick: () => handleKick(member.userId)
        }, 'Entfernen'));
      }

      membersList.appendChild(row);
    });
  }

  function renderActions() {
    const owner = isOwner();
    startButton.hidden = !owner;
    endButton.hidden = !owner || party.status === 'ended';

    if (owner) {
      const canStart = party.members.every(member => member.ready || member.role === 'owner');
      const stillInLobby = party.status === 'lobby';
      startButton.disabled = !canStart || !stillInLobby;
      startButton.textContent = stillInLobby
        ? (canStart ? 'Party starten' : 'Warte auf Teilnehmer …')
        : (party.status === 'countdown' ? 'Startet …' : 'Party läuft');
    }
  }

  function renderParty() {
    if (!party) return;
    renderMediaSummary();
    renderMembers();
    renderActions();
  }

  function renderError(error) {
    console.error('[Watch Party Init Error]', error);
    lobby.hidden = true;
    errorState.hidden = false;
    errorState.innerHTML = '';
    errorState.appendChild(createElement('h2', {}, 'Watch Party nicht verfügbar'));
    errorState.appendChild(createElement('p', {}, error.message || 'Diese Watch Party konnte nicht geladen werden.'));
    errorState.appendChild(createElement('button', {
      className: 'btn-primary',
      type: 'button',
      onClick: () => goHome()
    }, 'Zurück zur Startseite'));
  }

  function showEndedState(message) {
    if (ownerHeartbeatTimer) {
      window.clearInterval(ownerHeartbeatTimer);
      ownerHeartbeatTimer = null;
    }
    try {
      controller?.destroy();
    } catch (error) {
      console.warn('[Watch Party Ended Cleanup]', error);
    }
    controller = null;
    unlockPlayerViewport();
    playerMount.remove();
    countdownOverlay.hidden = true;
    autoplayOverlay.hidden = true;
    lobby.hidden = true;

    endedState.hidden = false;
    endedState.innerHTML = '';
    endedState.appendChild(createElement('h2', {}, 'Watch Party beendet'));
    endedState.appendChild(createElement('p', {}, message || 'Die Watch Party wurde beendet.'));
    endedState.appendChild(createElement('button', {
      className: 'btn-primary',
      type: 'button',
      onClick: () => goHome()
    }, 'Zurück zur Startseite'));
  }

  // --- Actions ---
  async function handleKick(userId) {
    try {
      await WatchPartyApi.kick(partyId, userId);
    } catch (error) {
      appStore.showToast(error.message || 'Mitglied konnte nicht entfernt werden', 'error');
    }
  }

  function handleStart() {
    socket?.sendJson({ type: 'OWNER_START' });
  }

  async function handleEnd() {
    if (ending) return;
    ending = true;
    try {
      const positionMs = controller?.player
        ? Math.round(controller.player.currentTime * 1000)
        : party?.positionMs || 0;
      await WatchPartyApi.end(partyId, positionMs);
    } catch (error) {
      appStore.showToast(error.message || 'Watch Party konnte nicht beendet werden', 'error');
    } finally {
      ending = false;
    }
  }

  async function handleCopyInvite() {
    try {
      await navigator.clipboard.writeText(inviteInput.value);
      appStore.showToast('Link kopiert', 'success');
    } catch {
      inviteInput.select();
    }
  }

  // --- Countdown ---
  function showCountdown(startsAtServerTimeMs) {
    countdownOverlay.hidden = false;
    if (countdownTimer) window.clearInterval(countdownTimer);

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((startsAtServerTimeMs - Date.now()) / 1000));
      countdownOverlay.textContent = remaining > 0 ? `Startet in ${remaining} …` : 'Los geht’s …';
      if (remaining <= 0) {
        window.clearInterval(countdownTimer);
        countdownTimer = null;
        window.setTimeout(() => { countdownOverlay.hidden = true; }, 600);
      }
    };

    tick();
    countdownTimer = window.setInterval(tick, 250);
  }

  // --- Player + sync ---
  function startOwnerHeartbeat() {
    if (ownerHeartbeatTimer) return;
    ownerHeartbeatTimer = window.setInterval(() => {
      if (!isOwner() || !controller?.player) return;
      socket?.sendJson({
        type: 'OWNER_SYNC',
        positionMs: Math.round(controller.player.currentTime * 1000),
        playing: !controller.player.paused
      });
    }, OWNER_SYNC_INTERVAL_MS);
  }

  function applySync({ positionMs, playing, serverTimeMs }) {
    if (!controller?.player) return;
    const elapsedMs = playing ? Date.now() - serverTimeMs : 0;
    const targetSeconds = (positionMs + elapsedMs) / 1000;
    const drift = controller.player.currentTime - targetSeconds;

    if (Math.abs(drift) > 2.5) {
      controller.player.currentTime = Math.max(0, targetSeconds);
      setSyncStatus('preparing', 'Synchronisiert …');
      return;
    }

    if (playing && Math.abs(drift) > 0.35) {
      controller.player.playbackRate = drift > 0 ? 0.98 : 1.02;
      setSyncStatus('preparing', 'Synchronisiert …');
      window.setTimeout(() => {
        if (controller?.player) controller.player.playbackRate = 1;
      }, 2500);
      return;
    }

    setSyncStatus('sync', 'Synchron');
  }

  async function safeApplyRemoteControl(payload) {
    if (!controller) return;
    try {
      await controller.applyRemoteControl(payload);
      autoplayOverlay.hidden = true;
    } catch (error) {
      if (payload.action === 'play') {
        autoplayOverlay.hidden = false;
      } else {
        console.warn('[Watch Party Remote Control]', error);
      }
    }
  }

  autoplayActivateButton.addEventListener('click', async () => {
    try {
      await controller?.applyRemoteControl({
        action: 'play',
        positionMs: party?.positionMs || 0,
        serverTimeMs: party?.lastServerTimeMs || Date.now(),
        playing: true
      });
      autoplayOverlay.hidden = true;
    } catch (error) {
      console.error('[Watch Party Autoplay Retry Error]', error);
    }
  });

  async function mountPlayer({ itemId, positionMs, force = false }) {
    if (destroyed) return;
    if (controller && !force) return;

    lobby.hidden = true;
    if (!playerMount.isConnected) container.insertBefore(playerMount, countdownOverlay);
    playerMount.classList.add('player-page', 'vanta-player-root');
    lockPlayerViewport();
    setSyncStatus('preparing', 'Wird vorbereitet');

    try {
      const [item, playerModule] = await Promise.all([
        MediaApi.getItem(itemId),
        import(PLAYER_MODULE_URL)
      ]);
      if (destroyed) return;

      const episodeContext = await loadEpisodeContext(item).catch(() => null);
      if (destroyed) return;

      controller = await playerModule.mountVantaPlayer({
        root: playerMount,
        itemId,
        title: item.Name || item.SeriesName || '',
        poster: getPosterUrl(item),
        resumePosition: (positionMs || 0) / 1000,
        resolvePlayback: (mode, options) => MediaApi.getPlayback(itemId, mode, options),
        reportPlayback: (event, payload, options) => MediaApi.reportPlayback(event, payload, options),
        onBack: goHome,
        watchParty: {
          enabled: true,
          isOwner: isOwner(),
          disableQualityMenu: true,
          onOwnerPlay: ownerPositionMs => socket?.sendJson({ type: 'OWNER_PLAY', positionMs: ownerPositionMs }),
          onOwnerPause: ownerPositionMs => socket?.sendJson({ type: 'OWNER_PAUSE', positionMs: ownerPositionMs }),
          onOwnerSeek: ownerPositionMs => socket?.sendJson({ type: 'OWNER_SEEK', positionMs: ownerPositionMs }),
          onPreloadStateChange: ({ state, message }) => socket?.sendJson({ type: 'PRELOAD_STATE', state, message })
        },
        episodeBrowser: episodeContext ? {
          enabled: true,
          context: episodeContext,
          readonly: !isOwner(),
          onSelectEpisode: episode => {
            if (!isOwner()) return;
            socket?.sendJson({ type: 'OWNER_CHANGE_EPISODE', itemId: episode.Id, positionMs: 0 });
          }
        } : null
      });

      if (destroyed) {
        controller?.destroy();
        controller = null;
        return;
      }

      if (isOwner()) startOwnerHeartbeat();
    } catch (error) {
      console.error('[Watch Party Player Error]', error);
      if (!destroyed) appStore.showToast('Player konnte nicht gestartet werden', 'error');
    }
  }

  async function replacePlayer({ itemId, positionMs }) {
    if (ownerHeartbeatTimer) {
      window.clearInterval(ownerHeartbeatTimer);
      ownerHeartbeatTimer = null;
    }
    try {
      controller?.destroy();
    } catch (error) {
      console.warn('[Watch Party Replace Cleanup]', error);
    }
    controller = null;
    playerMount.innerHTML = '';
    await mountPlayer({ itemId, positionMs, force: true });
  }

  // --- Socket ---
  function handleSocketMessage(message) {
    if (!message?.type || destroyed) return;

    switch (message.type) {
      case 'PARTY_STATE': {
        party = message.party;
        renderParty();
        if (controller) {
          applySync({
            positionMs: message.effectivePositionMs ?? party.positionMs,
            playing: party.status === 'playing',
            serverTimeMs: message.serverTimeMs
          });
        } else if (['playing', 'paused', 'countdown'].includes(party.status)) {
          mountPlayer({ itemId: party.playableItemId, positionMs: message.effectivePositionMs ?? party.positionMs });
        }
        return;
      }

      case 'PARTY_UPDATED':
        party = message.party;
        renderParty();
        return;

      case 'COUNTDOWN':
        showCountdown(message.startsAtServerTimeMs);
        return;

      case 'LOAD_MEDIA':
        if (message.reason === 'episode-change') {
          appStore.showToast(message.message || 'Folge gewechselt', 'success');
          replacePlayer({ itemId: message.itemId, positionMs: message.positionMs });
        } else {
          mountPlayer({ itemId: message.itemId, positionMs: message.positionMs });
        }
        return;

      case 'CONTROL':
        safeApplyRemoteControl({
          action: message.action,
          positionMs: message.positionMs,
          serverTimeMs: message.serverTimeMs,
          playing: message.action === 'play' || Boolean(message.playing)
        });
        return;

      case 'SYNC':
        applySync(message);
        return;

      case 'PARTY_ENDED':
        party = message.party || party;
        showEndedState(message.message);
        return;

      case 'KICKED':
        try {
          controller?.destroy();
        } catch (error) {
          console.warn('[Watch Party Kicked Cleanup]', error);
        }
        appStore.showToast('Du wurdest aus der Watch Party entfernt.', 'error');
        window.location.hash = '#/home';
        return;

      case 'ERROR':
        appStore.showToast(message.message || 'Ein Fehler ist aufgetreten', 'error');
        return;

      default:
        return;
    }
  }

  async function init() {
    try {
      const { party: joined } = await WatchPartyApi.join(partyId);
      if (destroyed) return;

      party = joined;
      inviteInput.value = `${window.location.origin}/#/watch-party/${partyId}`;

      if (party.status === 'ended') {
        showEndedState('Diese Watch Party wurde bereits beendet.');
        return;
      }

      renderParty();

      socket = createWatchPartySocket({
        partyId,
        onMessage: handleSocketMessage,
        onReconnecting: () => setSyncStatus('lost', 'Verbindung verloren. Reconnect läuft …')
      });

      mountPlayer({ itemId: party.playableItemId, positionMs: party.positionMs });
    } catch (error) {
      if (!destroyed) renderError(error);
    }
  }

  window.addEventListener('hashchange', handleHashChange);
  init();

  return container;
}
