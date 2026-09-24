import { createElement } from '../../../utils/dom.js';
import { memberInitial } from '../helpers.js';
import { icon } from './icons.js';

export const MAX_PARTY_MEMBERS = 4;

// What a member's chip says, depending on the phase the party is in.
export function memberState(member, { phase, selfPreload = null } = {}) {
  if (phase === 'waiting') {
    return member.connected
      ? { key: 'connected', label: 'Verbunden', progress: null }
      : { key: 'waiting', label: 'Verbindet …', progress: null };
  }

  if (member.ready || member.preloadState === 'ready') return { key: 'ready', label: 'Bereit', progress: 1 };
  if (member.preloadState === 'error') return { key: 'error', label: member.preloadMessage || 'Fehler', progress: null };

  const progress = selfPreload ? selfPreload.progress : Number(member.preloadProgress) || 0;
  if (member.preloadState === 'loaded' || progress >= 1) return { key: 'loaded', label: 'Geladen', progress: 1 };
  if (member.preloadState === 'preparing' || progress > 0) {
    const percent = Math.round(progress * 100);
    return { key: 'preparing', label: percent > 0 ? `Lädt ${percent} %` : 'Lädt …', progress };
  }
  if (!member.connected) return { key: 'waiting', label: 'Offline', progress: null };
  return { key: 'idle', label: 'Wartet', progress: 0 };
}

// Each member keeps the same avatar colour, derived from their user id. The
// golden angle spreads ids that differ in one character (u-2, u-3) far apart.
export function memberHue(userId = '') {
  let hash = 0;
  for (const char of String(userId)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return Math.round((hash * 137.508) % 360);
}

function avatarFor(member) {
  const avatar = createElement('span', { className: 'watch-party-member-avatar', 'aria-hidden': 'true' }, memberInitial(member.username));
  avatar.style.setProperty('--member-hue', String(memberHue(member.userId)));
  return avatar;
}

function roleBadge(member) {
  if (member.role === 'owner') return createElement('span', { className: 'watch-party-member-badge' }, 'Gastgeber');
  if (member.role === 'admin') return createElement('span', { className: 'watch-party-member-badge is-admin' }, 'Admin');
  return null;
}

export function createRoster(ctx) {
  const list = createElement('ul', { className: 'watch-party-members', 'aria-label': 'Teilnehmer' });
  const count = createElement('span', { className: 'watch-party-member-count' });
  const element = createElement('section', { className: 'watch-party-roster' },
    createElement('div', { className: 'watch-party-roster-head' },
      createElement('h2', { className: 'watch-party-roster-title' }, 'Teilnehmer'),
      count
    ),
    list
  );

  let knownIds = null;

  const renderMember = (member, { phase, isNew }) => {
    const isSelf = member.userId === ctx.currentUser?.id;
    const state = memberState(member, { phase, selfPreload: isSelf ? ctx.preload : null });

    const actions = createElement('span', { className: 'watch-party-member-actions' });
    if (phase === 'waiting' && ctx.isOwner() && !isSelf) {
      actions.appendChild(createElement('button', {
        className: 'watch-party-kick-button',
        type: 'button',
        'aria-label': `${member.username} entfernen`,
        onClick: () => ctx.handleKick(member.userId)
      }, 'Entfernen'));
    }
    actions.appendChild(createElement('span', {
      className: `watch-party-member-status is-${state.key === 'connected' ? 'connected' : state.key}`
    },
      state.key === 'ready' ? icon('check', 'watch-party-member-status-icon') : createElement('span', { className: 'watch-party-member-status-dot', 'aria-hidden': 'true' }),
      createElement('span', {}, state.label)
    ));

    const progress = state.progress === null ? null : createElement('span', {
      className: 'watch-party-member-progress',
      role: 'progressbar',
      'aria-label': `Ladefortschritt ${member.username}`,
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': String(Math.round(state.progress * 100))
    }, createElement('span', { style: { transform: `scaleX(${state.progress})` } }));

    return createElement('li', {
      className: `watch-party-member is-${state.key}${isSelf ? ' is-self' : ''}${isNew ? ' is-new' : ''}${member.connected ? ' is-online' : ''}`,
      dataset: { userId: member.userId }
    },
      avatarFor(member),
      createElement('span', { className: 'watch-party-member-body' },
        createElement('span', { className: 'watch-party-member-name' },
          createElement('span', { className: 'watch-party-member-username' }, member.username || 'Unbekannt'),
          isSelf ? createElement('span', { className: 'watch-party-member-self' }, 'Du') : null,
          roleBadge(member)
        ),
        progress
      ),
      actions
    );
  };

  const renderEmptySlot = index => {
    const canInvite = ctx.isOwner() && ctx.party?.status === 'lobby';
    const content = [
      createElement('span', { className: 'watch-party-member-avatar is-empty', 'aria-hidden': 'true' }, icon('userPlus')),
      createElement('span', { className: 'watch-party-member-body' },
        createElement('span', { className: 'watch-party-member-name' }, canInvite ? 'Platz frei · Einladen' : 'Platz frei')
      )
    ];
    return createElement('li', { className: 'watch-party-member is-empty', dataset: { slot: String(index) } },
      canInvite
        ? createElement('button', {
          className: 'watch-party-member-invite',
          type: 'button',
          onClick: () => ctx.openInviteUserMenu()
        }, ...content)
        : createElement('span', { className: 'watch-party-member-placeholder' }, ...content)
    );
  };

  const render = () => {
    if (!ctx.party) return;
    const phase = ctx.party.status === 'lobby' ? 'waiting' : 'ready';
    const members = ctx.party.members || [];
    count.textContent = `${members.length}/${MAX_PARTY_MEMBERS}`;

    const ids = new Set(members.map(member => member.userId));
    list.innerHTML = '';
    members.forEach(member => {
      list.appendChild(renderMember(member, { phase, isNew: knownIds !== null && !knownIds.has(member.userId) }));
    });
    for (let index = members.length; index < MAX_PARTY_MEMBERS; index++) list.appendChild(renderEmptySlot(index));
    knownIds = ids;
  };

  return { element, render };
}
