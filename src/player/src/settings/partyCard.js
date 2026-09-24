import { memberHue, memberStatus } from '../partyStatus.js';

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Top of the settings flyout in a watch party: everyone's avatar with a
// status dot, the own sync state and "Neu synchronisieren". Refreshed every
// second while the flyout is open.
export function createPartyCard(watchParty) {
  const element = document.createElement('div');
  element.className = 'vanta-settings-party';
  element.innerHTML = `
    <div class="vanta-settings-party-head">
      <span class="vanta-settings-party-title">Watch Party</span>
      <span class="vanta-settings-party-avatars"></span>
    </div>
    <div class="vanta-settings-sync">
      <span class="vanta-settings-sync-dot" aria-hidden="true"></span>
      <span class="vanta-settings-sync-label" role="status"></span>
    </div>`;
  const avatars = element.querySelector('.vanta-settings-party-avatars');
  const sync = element.querySelector('.vanta-settings-sync');

  if (watchParty.onResync) {
    const resync = document.createElement('button');
    resync.type = 'button';
    resync.className = 'vanta-settings-sync-button vanta-settings-focusable';
    resync.textContent = 'Neu synchronisieren';
    resync.addEventListener('click', () => watchParty.onResync());
    sync.appendChild(resync);
  }

  const update = () => {
    const status = watchParty.getSyncStatus?.() || { kind: 'preparing', label: 'Wird vorbereitet' };
    sync.dataset.status = status.kind;
    sync.querySelector('.vanta-settings-sync-label').textContent = status.label;

    avatars.innerHTML = (watchParty.participants || []).map(member => {
      const state = memberStatus(member);
      const name = member.username || 'Unbekannt';
      return `<span class="vanta-settings-party-avatar" data-state="${state.key}" style="--member-hue:${memberHue(member.userId)}"
        title="${escapeHtml(`${name} · ${state.label}`)}" aria-label="${escapeHtml(`${name}: ${state.label}`)}">${escapeHtml(name.slice(0, 1).toUpperCase())}</span>`;
    }).join('');
  };
  update();
  return { element, update };
}
