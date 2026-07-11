import { createElement } from '../utils/dom.js';
import { WatchPartyApi } from '../api/watch-party.api.js';
import { MediaApi } from '../api/media.api.js';
import { createWatchPartySocket } from '../realtime/watch-party.socket.js';
import { authStore } from '../store/auth.store.js';
import { appStore } from '../store/app.store.js';
import { loadEpisodeContext } from '../utils/episodeContext.js';

const PLAYER_MODULE_URL = '/vendor/player/vanta-player.js';
const OWNER_SYNC_INTERVAL_MS = 5000;

const PLAYER_ROOM_STATUSES = new Set(['ready-room', 'countdown', 'playing', 'paused']);
const PLAYBACK_STATUSES = new Set(['playing', 'paused']);

function shouldShowPlayerForParty(nextParty) {
  return PLAYER_ROOM_STATUSES.has(nextParty?.status);
}

function connectedMemberCount(members) {
  return members.filter(member => member.connected).length;
}

function memberInitial(username) {
  return (username || '?').trim().charAt(0).toUpperCase() || '?';
}

function formatPosition(positionMs) {
  if (!positionMs || positionMs <= 0) return 'Von Anfang an';
  const totalSeconds = Math.floor(positionMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const time = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
  return `Fortsetzen bei ${time}`;
}

function formatRuntime(runtimeTicks) {
  if (!runtimeTicks) return null;
  const minutes = Math.round(runtimeTicks / 10_000_000 / 60);
  return minutes > 0 ? `${minutes} Min.` : null;
}

function countdownMetaParts(snapshot) {
  const parts = [];
  if (snapshot.productionYear) parts.push(String(snapshot.productionYear));
  if (snapshot.officialRating) parts.push(snapshot.officialRating);
  if (snapshot.communityRating) parts.push(`★ ${Number(snapshot.communityRating).toFixed(1)}`);
  const runtime = formatRuntime(snapshot.runtimeTicks);
  if (runtime) parts.push(runtime);
  return parts;
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
  let watchPartyConfig = null;
  let localReadyPreparing = false;
  let lastPlayStartServerTimeMs = null;
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
  }, 'Starten');

  const startHint = createElement('div', { className: 'watch-party-start-hint' });

  const actionsRow = createElement('div', { className: 'watch-party-actions' }, startButton, startHint);

  const lobby = createElement('div', { className: 'watch-party-lobby' }, mediaSummary, inviteRow, membersList, actionsRow);

  const playerMount = createElement('div', { className: 'watch-party-player-mount' });

  const countdownNumber = createElement('div', {
    className: 'watch-party-countdown-number',
    hidden: true,
    'aria-hidden': 'true'
  });
  const countdownGraphic = createElement('div', { className: 'numero_counting_wrapper' },
    createElement('div', { className: 'numero_shape' })
  );
  const countdownTitle = createElement('div', { className: 'watch-party-countdown-title' });
  const countdownMeta = createElement('div', { className: 'watch-party-countdown-meta' });
  const countdownPosition = createElement('div', { className: 'watch-party-countdown-position' });
  const countdownModal = createElement('div', { className: 'watch-party-countdown-modal' },
    countdownGraphic, countdownNumber, countdownTitle, countdownMeta, countdownPosition
  );
  const countdownOverlay = createElement('div', { className: 'watch-party-countdown-overlay', hidden: true }, countdownModal);

  const readyTitle = createElement('h2', { className: 'watch-party-ready-title' }, 'Bereit zum gemeinsamen Schauen?');
  const readySubtitle = createElement('p', { className: 'watch-party-ready-subtitle' }, 'Jeder Teilnehmer muss einmal Bereit klicken, bevor die Wiedergabe startet.');
  const readyMembersList = createElement('ul', { className: 'watch-party-ready-members' });
  const readyButton = createElement('button', {
    className: 'watch-party-ready-button',
    type: 'button',
    onClick: () => handleReadyClick()
  }, 'Bereit');
  const readyStatus = createElement('p', { className: 'watch-party-ready-status' });
  const readyOverlay = createElement('div', { className: 'watch-party-ready-overlay', hidden: true },
    createElement('div', { className: 'watch-party-ready-panel' },
      readyTitle,
      readySubtitle,
      readyMembersList,
      readyButton,
      readyStatus
    )
  );

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
  container.appendChild(readyOverlay);
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
          className: `watch-party-member-status ${member.connected ? 'is-connected' : 'is-waiting'}`
        }, member.connected ? 'Verbunden' : 'Verbindet …')
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
    startHint.hidden = !owner;

    if (owner) {
      const stillInLobby = party.status === 'lobby';
      startButton.textContent = 'Starten';
      startButton.disabled = !stillInLobby;

      if (!stillInLobby) {
        startHint.textContent = party.status === 'ready-room'
          ? 'Warte auf Bereitmeldungen'
          : (party.status === 'countdown' ? 'Startet …' : 'Party läuft');
      } else {
        const count = connectedMemberCount(party.members);
        startHint.textContent = count > 1 ? 'Bereit zum Öffnen des Player-Raums' : 'Du kannst auch alleine starten';
      }
    }
  }

  function readyStateLabel(member) {
    if (member.ready || member.preloadState === 'ready') return 'Bereit';
    if (member.preloadState === 'preparing') return 'Wird vorbereitet …';
    if (member.preloadState === 'error') return member.preloadMessage || 'Fehler';
    return 'Wartet';
  }

  function readyStateClass(member) {
    if (member.ready || member.preloadState === 'ready') return 'is-ready';
    if (member.preloadState === 'preparing') return 'is-preparing';
    if (member.preloadState === 'error') return 'is-error';
    return 'is-idle';
  }

  function renderReadyOverlay() {
    if (!party) return;
    readyMembersList.innerHTML = '';
    const self = party.members.find(member => member.userId === currentUser?.id);

    party.members.forEach(member => {
      readyMembersList.appendChild(createElement('li', {
        className: `watch-party-ready-member ${readyStateClass(member)}`
      },
        createElement('span', { className: 'watch-party-member-avatar' }, memberInitial(member.username)),
        createElement('span', { className: 'watch-party-ready-member-name' }, `${member.username}${member.userId === currentUser?.id ? ' (Du)' : ''}`),
        createElement('span', { className: 'watch-party-ready-member-state' }, readyStateLabel(member))
      ));
    });

    const allReady = party.members.length > 0 && party.members.every(member => member.ready);
    const selfReady = Boolean(self?.ready);
    const selfPreparing = localReadyPreparing || self?.preloadState === 'preparing';
    readyButton.hidden = party.status !== 'ready-room';
    readyButton.disabled = selfReady || selfPreparing || party.status !== 'ready-room';
    readyButton.textContent = selfReady ? 'Bereit' : (selfPreparing ? 'Wird bestätigt …' : 'Bereit');
    readyStatus.textContent = allReady
      ? 'Alle sind bereit. Countdown startet gleich.'
      : 'Warte, bis alle Teilnehmer bereit sind.';

    if (party.status === 'countdown') {
      readyStatus.textContent = 'Alle sind bereit. Countdown läuft.';
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
    if (!isOwner() || party?.status !== 'lobby') return;
    socket?.sendJson({ type: 'OWNER_OPEN_READY_ROOM' });
  }

  async function handleReadyClick() {
    if (localReadyPreparing || party?.status !== 'ready-room') return;
    localReadyPreparing = true;
    renderReadyOverlay();

    try {
      await ensurePlayerReadyRoom();
      socket?.sendJson({ type: 'PLAYER_READY' });
    } catch (error) {
      socket?.sendJson({
        type: 'PLAYER_READY_STATE',
        state: 'error',
        message: error.message || 'Player-Raum konnte nicht geöffnet werden'
      });
    } finally {
      localReadyPreparing = false;
      renderReadyOverlay();
    }
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
  function showCountdown({ startsAtServerTimeMs, positionMs }) {
    hideReadyOverlay();
    countdownOverlay.hidden = false;
    if (countdownTimer) window.clearInterval(countdownTimer);

    const snapshot = party?.itemSnapshot || {};
    const metaParts = countdownMetaParts(snapshot);
    countdownTitle.textContent = snapshot.name || 'Unbekanntes Medium';
    countdownMeta.textContent = metaParts.join(' · ');
    countdownMeta.hidden = metaParts.length === 0;
    countdownPosition.textContent = formatPosition(positionMs);

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((startsAtServerTimeMs - Date.now()) / 1000));
      countdownNumber.textContent = String(remaining);
      if (remaining <= 0) {
        window.clearInterval(countdownTimer);
        countdownTimer = null;
      }
    };

    tick();
    countdownTimer = window.setInterval(tick, 250);
  }

  function hideCountdown() {
    countdownOverlay.hidden = true;
    if (countdownTimer) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
    }
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

  function shouldRunOwnerHeartbeat() {
    return isOwner() && Boolean(controller?.player) && ['playing', 'paused'].includes(party?.status);
  }

  function maybeStartOwnerHeartbeat() {
    if (!shouldRunOwnerHeartbeat()) return;
    startOwnerHeartbeat();
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

  let blockedPlayPayload = null;

  async function safeApplyRemoteControl(payload) {
    if (!controller) return;
    try {
      await controller.applyRemoteControl(payload);
      blockedPlayPayload = null;
      autoplayOverlay.hidden = true;
    } catch (error) {
      if (payload.action === 'play') {
        blockedPlayPayload = payload;
        autoplayOverlay.hidden = false;
      } else {
        console.warn('[Watch Party Remote Control]', error);
      }
    }
  }

  async function handleControlPlay(payload) {
    try {
      const playStartServerTimeMs = Number(payload.serverTimeMs) || Date.now();
      if (lastPlayStartServerTimeMs === playStartServerTimeMs) return;
      lastPlayStartServerTimeMs = playStartServerTimeMs;

      if (party) {
        party.status = 'playing';
        party.positionMs = payload.positionMs;
        party.lastServerTimeMs = playStartServerTimeMs;
      }
      hideReadyOverlay();
      hideCountdown();
      await ensurePlayerPlayback();
      showPlayerSurface();
      if (controller?.prepareInitialPlayback) {
        await controller.prepareInitialPlayback({ position: (payload.positionMs || 0) / 1000 });
      }
      maybeStartOwnerHeartbeat();
      await safeApplyRemoteControl(payload);
    } catch (error) {
      lastPlayStartServerTimeMs = null;
      appStore.showToast(error.message || 'Wiedergabe konnte nicht gestartet werden', 'error');
    }
  }

  autoplayActivateButton.addEventListener('click', async () => {
    if (!blockedPlayPayload) return;
    await safeApplyRemoteControl(blockedPlayPayload);
  });

  function ensurePlayerMountAttached() {
    if (!playerMount.isConnected) {
      container.insertBefore(playerMount, countdownOverlay);
    }
  }

  function showPlayerSurface() {
    lobby.hidden = true;
    ensurePlayerMountAttached();
    playerMount.removeAttribute('aria-hidden');
    playerMount.classList.add('player-page', 'vanta-player-root');
    lockPlayerViewport();
  }

  function showReadyRoom() {
    showPlayerSurface();
    readyOverlay.hidden = false;
    autoplayOverlay.hidden = true;
    setSyncStatus('preparing', 'Bereitmachen');
    renderReadyOverlay();
  }

  function hideReadyOverlay() {
    readyOverlay.hidden = true;
  }

  function setPlaybackPhase() {
    if (watchPartyConfig) watchPartyConfig.phase = 'playback';
  }

  async function mountPlayer({ itemId, positionMs, force = false, phase = 'playback', deferInitialLoad = false }) {
    if (destroyed) return;

    if (controller && !force) {
      if (phase === 'ready-room') {
        showReadyRoom();
      } else {
        showPlayerSurface();
      }
      if (watchPartyConfig) watchPartyConfig.phase = phase;
      return;
    }

    ensurePlayerMountAttached();
    showPlayerSurface();
    if (phase === 'ready-room') showReadyRoom();
    setSyncStatus('preparing', 'Wird vorbereitet');

    try {
      const [item, playerModule] = await Promise.all([
        MediaApi.getItem(itemId),
        import(PLAYER_MODULE_URL)
      ]);
      if (destroyed) return;

      const episodeContext = await loadEpisodeContext(item).catch(() => null);
      if (destroyed) return;

      watchPartyConfig = {
        enabled: true,
        phase,
        isOwner: isOwner(),
        disableQualityMenu: true,
        onOwnerPlay: ownerPositionMs => socket?.sendJson({ type: 'OWNER_PLAY', positionMs: ownerPositionMs }),
        onOwnerPause: ownerPositionMs => socket?.sendJson({ type: 'OWNER_PAUSE', positionMs: ownerPositionMs }),
        onOwnerSeek: ownerPositionMs => socket?.sendJson({ type: 'OWNER_SEEK', positionMs: ownerPositionMs })
      };

      controller = await playerModule.mountVantaPlayer({
        root: playerMount,
        itemId,
        title: item.Name || item.SeriesName || '',
        poster: getPosterUrl(item),
        resumePosition: (positionMs || 0) / 1000,
        resolvePlayback: (mode, options) => MediaApi.getPlayback(itemId, mode, options),
        reportPlayback: (event, payload, options) => MediaApi.reportPlayback(event, payload, options),
        onBack: goHome,
        watchParty: watchPartyConfig,
        deferInitialLoad,
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

      maybeStartOwnerHeartbeat();
      if (phase === 'ready-room') renderReadyOverlay();
    } catch (error) {
      console.error('[Watch Party Player Error]', error);
      if (!destroyed) appStore.showToast('Player konnte nicht gestartet werden', 'error');
    }
  }

  async function ensurePlayerReadyRoom() {
    if (controller) {
      showReadyRoom();
      if (watchPartyConfig) watchPartyConfig.phase = 'ready-room';
      return;
    }
    await mountPlayer({
      itemId: party.playableItemId,
      positionMs: party.positionMs,
      phase: 'ready-room',
      deferInitialLoad: true
    });
  }

  async function ensurePlayerPlayback() {
    if (controller) {
      showPlayerSurface();
      setPlaybackPhase();
      return;
    }
    await mountPlayer({
      itemId: party.playableItemId,
      positionMs: party.positionMs,
      phase: 'playback',
      deferInitialLoad: true
    });
    setPlaybackPhase();
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
        if (party.status === 'ready-room' || party.status === 'countdown') {
          ensurePlayerReadyRoom();
        } else if (controller && PLAYBACK_STATUSES.has(party.status)) {
          applySync({
            positionMs: message.effectivePositionMs ?? party.positionMs,
            playing: party.status === 'playing',
            serverTimeMs: message.serverTimeMs
          });
          maybeStartOwnerHeartbeat();
        } else if (shouldShowPlayerForParty(party)) {
          mountPlayer({
            itemId: party.playableItemId,
            positionMs: message.effectivePositionMs ?? party.positionMs,
            phase: 'playback'
          });
        }
        return;
      }

      case 'PARTY_UPDATED':
        const previousStatus = party?.status;
        party = message.party;
        renderParty();
        if (party.status === 'ready-room' || party.status === 'countdown') {
          ensurePlayerReadyRoom();
          renderReadyOverlay();
        } else if (party.status === 'playing' && previousStatus === 'countdown') {
          void handleControlPlay({
            action: 'play',
            positionMs: party.positionMs,
            serverTimeMs: party.lastServerTimeMs || Date.now(),
            playing: true
          });
        } else if (shouldShowPlayerForParty(party)) {
          if (controller) {
            showPlayerSurface();
            setPlaybackPhase();
            maybeStartOwnerHeartbeat();
          } else if (party.playableItemId) {
            mountPlayer({
              itemId: party.playableItemId,
              positionMs: party.positionMs,
              phase: 'playback'
            });
          }
        }
        return;

      case 'COUNTDOWN':
        if (party) party.status = 'countdown';
        ensurePlayerReadyRoom();
        showCountdown({
          startsAtServerTimeMs: message.startsAtServerTimeMs,
          positionMs: message.positionMs ?? party?.positionMs
        });
        renderReadyOverlay();
        return;

      case 'LOAD_MEDIA':
        if (message.reason === 'episode-change') {
          appStore.showToast(message.message || 'Folge gewechselt', 'success');
          replacePlayer({ itemId: message.itemId, positionMs: message.positionMs });
        } else {
          mountPlayer({ itemId: message.itemId, positionMs: message.positionMs });
        }
        return;

      case 'CONTROL': {
        const payload = {
          action: message.action,
          positionMs: message.positionMs,
          serverTimeMs: message.serverTimeMs,
          playing: message.action === 'play' || Boolean(message.playing)
        };

        if (message.action === 'play') {
          void handleControlPlay(payload);
          return;
        }

        safeApplyRemoteControl(payload);
        return;
      }

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

      if (party.status === 'ready-room' || party.status === 'countdown') {
        ensurePlayerReadyRoom();
      } else if (PLAYBACK_STATUSES.has(party.status)) {
        mountPlayer({ itemId: party.playableItemId, positionMs: party.positionMs, phase: 'playback' });
      }
    } catch (error) {
      if (!destroyed) renderError(error);
    }
  }

  window.addEventListener('hashchange', handleHashChange);
  init();

  return container;
}
