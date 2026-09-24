import { formatEpisodeCode, findEpisode, findSeasonIdOfEpisode } from '../episodes.js';
import { canBan, canPromote, roleLabel } from '../watchPartyParticipants.js';

const CHECK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z"/></svg>';

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// A single-choice list (subtitles, quality). Picking an option applies it and
// returns to the start page, where the row now shows the new value.
export function renderOptionsPage(body, { options, onSelect, emptyLabel = 'Keine Auswahl verfügbar' }, flyout) {
  const list = document.createElement('div');
  list.className = 'vanta-settings-list';
  list.setAttribute('role', 'radiogroup');

  const choices = options.filter(option => !option.disabled);
  if (!choices.length) {
    const empty = document.createElement('div');
    empty.className = 'vanta-settings-empty';
    empty.textContent = options[0]?.label || emptyLabel;
    body.appendChild(empty);
    return;
  }

  choices.forEach(option => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `vanta-settings-option vanta-settings-focusable${option.selected ? ' is-selected' : ''}`;
    item.setAttribute('role', 'radio');
    item.setAttribute('aria-checked', option.selected ? 'true' : 'false');
    item.dataset.optionId = option.id;
    item.innerHTML = `
      <span class="vanta-settings-option-label">${escapeHtml(option.label)}</span>
      <span class="vanta-settings-option-check">${option.selected ? CHECK_ICON : ''}</span>`;
    item.addEventListener('click', () => {
      if (!option.selected) onSelect(option.id);
      flyout.back();
    });
    list.appendChild(item);
  });
  body.appendChild(list);
}

// Season chips on top, the episodes of the chosen season below. Viewers in a
// watch party can look but not switch.
export function renderEpisodesPage(body, { context, readonly, onSelectEpisode }, flyout) {
  const seasons = context?.seasons || [];
  let seasonId = findSeasonIdOfEpisode(context, context?.currentEpisodeId);

  const tabs = document.createElement('div');
  tabs.className = 'vanta-settings-seasons';
  tabs.setAttribute('role', 'tablist');
  const list = document.createElement('div');
  list.className = 'vanta-settings-episodes';

  const renderList = () => {
    tabs.querySelectorAll('.vanta-settings-season').forEach(tab => {
      const active = tab.dataset.seasonId === seasonId;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    const episodes = context?.episodesBySeason?.[seasonId] || [];
    list.innerHTML = episodes.map(episode => {
      const current = episode.Id === context.currentEpisodeId;
      return `
        <button type="button"
          class="vanta-settings-episode vanta-settings-focusable${current ? ' is-current' : ''}"
          data-episode-id="${escapeHtml(episode.Id)}"
          ${current ? 'aria-current="true"' : ''}
          ${readonly ? 'disabled aria-disabled="true"' : ''}>
          <span class="vanta-settings-episode-code">${formatEpisodeCode(episode)}</span>
          <span class="vanta-settings-episode-title">${escapeHtml(episode.Name || 'Unbenannte Folge')}</span>
          ${current ? '<span class="vanta-settings-episode-now">Läuft</span>' : ''}
        </button>`;
    }).join('') || '<div class="vanta-settings-empty">Keine Folgen in dieser Staffel</div>';
  };

  seasons.forEach(season => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'vanta-settings-season vanta-settings-focusable';
    tab.setAttribute('role', 'tab');
    tab.dataset.seasonId = season.Id;
    tab.textContent = season.Name || `Staffel ${season.IndexNumber ?? ''}`;
    tab.addEventListener('click', () => {
      seasonId = season.Id;
      renderList();
    });
    tabs.appendChild(tab);
  });

  list.addEventListener('click', event => {
    const row = event.target.closest('[data-episode-id]');
    if (!row || readonly) return;
    const episode = findEpisode(context, row.dataset.episodeId);
    if (!episode || episode.Id === context.currentEpisodeId) return;
    onSelectEpisode?.(episode);
    flyout.close();
  });

  if (seasons.length > 1) body.appendChild(tabs);
  if (readonly) {
    const hint = document.createElement('p');
    hint.className = 'vanta-settings-hint';
    hint.textContent = 'Nur Admins können die Folge wechseln.';
    body.appendChild(hint);
  }
  body.appendChild(list);
  renderList();
}

// Party members with their role and connection; admins can promote viewers
// and ban (a ban takes a second, confirming click).
export function renderParticipantsPage(body, { watchParty, pendingBan }) {
  const participants = watchParty.participants || [];
  const viewerRole = participants.find(member => member.userId === watchParty.currentUserId)?.role || 'viewer';

  const list = document.createElement('div');
  list.className = 'vanta-settings-participants';
  list.innerHTML = participants.map(member => {
    const badge = roleLabel(member.role);
    const promote = canPromote({ viewerRole, member, currentUserId: watchParty.currentUserId });
    const ban = canBan({ viewerRole, member, currentUserId: watchParty.currentUserId });
    const confirming = pendingBan.userId === member.userId;
    const isSelf = member.userId === watchParty.currentUserId;
    return `
      <div class="vanta-settings-participant" data-user-id="${escapeHtml(member.userId)}">
        <span class="vanta-settings-avatar">${escapeHtml((member.username || '?').slice(0, 1).toUpperCase())}</span>
        <span class="vanta-settings-participant-main">
          <span class="vanta-settings-participant-name">
            <strong>${escapeHtml(member.username || 'Unbekannt')}</strong>
            ${isSelf ? '<span class="vanta-settings-tag">Du</span>' : ''}
            ${badge ? `<span class="vanta-settings-tag is-role">${badge}</span>` : ''}
          </span>
          <span class="vanta-settings-participant-status ${member.connected ? 'is-connected' : 'is-offline'}">
            ${member.connected ? 'Verbunden' : 'Offline'}
          </span>
        </span>
        <span class="vanta-settings-participant-actions">
          ${promote ? `<button type="button" class="vanta-settings-action vanta-settings-focusable" data-action="promote" data-user-id="${escapeHtml(member.userId)}">Admin machen</button>` : ''}
          ${ban ? `<button type="button" class="vanta-settings-action vanta-settings-focusable is-danger${confirming ? ' is-confirming' : ''}" data-action="${confirming ? 'confirm-ban' : 'ban'}" data-user-id="${escapeHtml(member.userId)}">${confirming ? 'Wirklich bannen?' : 'Bannen'}</button>` : ''}
        </span>
      </div>`;
  }).join('') || '<div class="vanta-settings-empty">Keine Teilnehmer</div>';

  list.addEventListener('click', event => {
    const action = event.target.closest('button[data-action]');
    if (!action) return;
    const userId = action.dataset.userId;
    if (action.dataset.action === 'promote') {
      watchParty.onPromoteMember?.(userId);
    } else if (action.dataset.action === 'ban') {
      pendingBan.userId = userId;
      pendingBan.refresh();
    } else if (action.dataset.action === 'confirm-ban') {
      pendingBan.userId = null;
      watchParty.onBanMember?.(userId);
      pendingBan.refresh();
    }
  });
  body.appendChild(list);
}
