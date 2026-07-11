import { createElement } from '../utils/dom.js';
import { WatchPartyApi } from '../api/watch-party.api.js';
import { MediaApi } from '../api/media.api.js';
import { createWatchPartySocket } from '../realtime/watch-party.socket.js';
import { authStore } from '../store/auth.store.js';
import { appStore } from '../store/app.store.js';

const PLAYER_MODULE_URL = '/vendor/player/vanta-player.js';
const OWNER_SYNC_INTERVAL_MS = 5000;

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
  let destroyed = false;
  let scrollLockY = 0;

  const isOwner = () => Boolean(party && currentUser && party.ownerUserId === currentUser.id);
  const currentMember = () => party?.members.find(member => member.userId === currentUser?.id) || null;

  // --- DOM ---
  const backButton = createElement('button', {
    className: 'watch-party-back',
    type: 'button',
    onClick: () => goHome()
  }, '← Zurück');

  const header = createElement('div', { className: 'watch-party-header' },
    backButton,
    createElement('h1', { className: 'watch-party-title' }, 'Watch Party')
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

  const readyButton = createElement('button', {
    className: 'watch-party-ready-button',
    type: 'button',
    onClick: () => handleReadyToggle()
  }, 'Bereit');

  const startButton = createElement('button', {
    className: 'watch-party-start-button',
    type: 'button',
    onClick: () => handleStart()
  }, 'Party starten');

  const actionsRow = createElement('div', { className: 'watch-party-actions' }, readyButton, startButton);

  const lobby = createElement('div', { className: 'watch-party-lobby' }, mediaSummary, inviteRow, membersList, actionsRow);

  const playerMount = createElement('div', { className: 'watch-party-player-mount' });

  const errorState = createElement('div', { className: 'watch-party-error', hidden: true });

  container.appendChild(header);
  container.appendChild(lobby);
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
          className: `watch-party-member-status${member.ready ? ' is-ready' : ''}`
        }, member.ready ? 'Bereit' : 'Wartet …')
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
    readyButton.hidden = owner;
    startButton.hidden = !owner;

    if (!owner) {
      const ready = Boolean(currentMember()?.ready);
      readyButton.textContent = ready ? 'Bereit ✓' : 'Bereit';
      readyButton.classList.toggle('is-ready', ready);
    } else {
      const canStart = party.members.every(member => member.ready || member.role === 'owner');
      const stillInLobby = party.status === 'lobby';
      startButton.disabled = !canStart || !stillInLobby;
      startButton.textContent = stillInLobby
        ? (canStart ? 'Party starten' : 'Warte auf Teilnehmer …')
        : 'Party läuft';
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

  // --- Actions ---
  async function handleReadyToggle() {
    const nextReady = !currentMember()?.ready;
    readyButton.disabled = true;
    try {
      const { party: updated } = await WatchPartyApi.setReady(partyId, nextReady);
      party = updated;
      renderParty();
    } catch (error) {
      appStore.showToast(error.message || 'Status konnte nicht aktualisiert werden', 'error');
    } finally {
      readyButton.disabled = false;
    }
  }

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

  async function handleCopyInvite() {
    try {
      await navigator.clipboard.writeText(inviteInput.value);
      appStore.showToast('Link kopiert', 'success');
    } catch {
      inviteInput.select();
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

  function applySync({ positionMs, playing, serverTimeMs }) {
    if (!controller?.player) return;
    const elapsedMs = playing ? Date.now() - serverTimeMs : 0;
    const targetSeconds = (positionMs + elapsedMs) / 1000;
    const drift = controller.player.currentTime - targetSeconds;

    if (Math.abs(drift) > 2.5) {
      controller.player.currentTime = Math.max(0, targetSeconds);
      return;
    }

    if (playing && Math.abs(drift) > 0.35) {
      controller.player.playbackRate = drift > 0 ? 0.98 : 1.02;
      window.setTimeout(() => {
        if (controller?.player) controller.player.playbackRate = 1;
      }, 2500);
    }
  }

  async function mountPlayer({ itemId, positionMs }) {
    if (controller || destroyed) return;

    lobby.hidden = true;
    playerMount.classList.add('player-page', 'vanta-player-root');
    container.appendChild(playerMount);
    lockPlayerViewport();

    try {
      const [item, playerModule] = await Promise.all([
        MediaApi.getItem(itemId),
        import(PLAYER_MODULE_URL)
      ]);
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
          onOwnerSeek: ownerPositionMs => socket?.sendJson({ type: 'OWNER_SEEK', positionMs: ownerPositionMs })
        }
      });

      if (destroyed) {
        controller?.destroy();
        return;
      }

      if (isOwner()) startOwnerHeartbeat();
    } catch (error) {
      console.error('[Watch Party Player Error]', error);
      if (!destroyed) appStore.showToast('Player konnte nicht gestartet werden', 'error');
    }
  }

  // --- Socket ---
  function handleSocketMessage(message) {
    if (!message?.type) return;

    switch (message.type) {
      case 'PARTY_UPDATED':
        party = message.party;
        renderParty();
        return;

      case 'LOAD_MEDIA':
        mountPlayer({ itemId: message.itemId, positionMs: message.positionMs });
        return;

      case 'CONTROL':
        controller?.applyRemoteControl?.({
          action: message.action,
          positionMs: message.positionMs,
          serverTimeMs: message.serverTimeMs,
          playing: message.action === 'play' || Boolean(message.playing)
        });
        return;

      case 'SYNC':
        applySync(message);
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
      renderParty();

      socket = createWatchPartySocket({ partyId, onMessage: handleSocketMessage });

      if (party.status === 'playing' || party.status === 'paused') {
        mountPlayer({ itemId: party.playableItemId, positionMs: party.positionMs });
      }
    } catch (error) {
      if (!destroyed) renderError(error);
    }
  }

  window.addEventListener('hashchange', handleHashChange);
  init();

  return container;
}
