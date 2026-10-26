import { createElement } from '../../../utils/dom.js';
import { MediaApi } from '../../../api/media.api.js';
import { WatchPartyApi } from '../../../api/watch-party.api.js';
import { episodeCode } from '../../../shared/episodeCode.js';
import { cssUrl } from '../../../utils/image.js';

const STATUS_LABELS = {
  lobby: 'Wartet auf Start',
  'ready-room': 'Macht sich bereit',
  countdown: 'Startet gleich',
  playing: 'Läuft',
  paused: 'Pausiert',
  switching: 'Nächste Folge lädt'
};

export function recentPartyTitle(snapshot = {}) {
  if (snapshot.type === 'Episode' && snapshot.seriesName) {
    return `${snapshot.seriesName} · ${episodeCode(snapshot.seasonNumber, snapshot.episodeNumber)}`;
  }
  return snapshot.name || 'Watch Party';
}

export function recentPartyMeta(party) {
  return [
    party.ownerName ? `von ${party.ownerName}` : null,
    STATUS_LABELS[party.status] || null,
    `${party.memberCount}/${party.maxMembers} Plätze`
  ].filter(Boolean).join(' · ');
}

// Parties the user was in (as owner or guest) that still live: the dialog
// opens on "Weiterschauen" for each of them or "Neue Watch Party starten".
// A party is gone once nobody has been in it for a while (server side).
export function bindRecentParties(ctx) {
  ctx.liveParties = [];

  ctx.loadRecentParties = async () => {
    try {
      const { parties = [] } = await WatchPartyApi.recent();
      ctx.liveParties = parties;
    } catch (error) {
      console.warn('[Watch Party Recent]', error);
      ctx.liveParties = [];
    }
    return ctx.liveParties;
  };

  const joinParty = party => {
    ctx.setOpen(false);
    window.location.hash = `#/watch-party/${party.id}`;
  };

  const renderParty = party => {
    const backdrop = party.itemSnapshot?.backdrop;
    const thumb = createElement('span', { className: 'watch-party-recent-thumb', 'aria-hidden': 'true' });
    if (backdrop?.id) {
      thumb.style.backgroundImage = cssUrl(MediaApi.getImageUrl(backdrop.id, 'Backdrop', 320, { tag: backdrop.tag, quality: 80 }));
    }
    return createElement('li', { className: 'watch-party-recent-item' },
      thumb,
      createElement('span', { className: 'watch-party-recent-body' },
        createElement('span', { className: 'watch-party-recent-name' }, recentPartyTitle(party.itemSnapshot)),
        createElement('span', { className: 'watch-party-recent-meta' }, recentPartyMeta(party))
      ),
      createElement('button', {
        className: 'watch-party-recent-join',
        type: 'button',
        disabled: party.full,
        'aria-label': party.full ? 'Watch Party ist voll' : `${recentPartyTitle(party.itemSnapshot)} weiterschauen`,
        onClick: () => joinParty(party)
      }, party.full ? 'Voll' : 'Weiterschauen')
    );
  };

  // `item`: the title the dialog was opened for ("Watch Party starten" on a
  // card); a new party goes straight to it.
  ctx.showContinueChoice = (item = null) => {
    ctx.searchRunId += 1;
    ctx.currentView = 'continue-choice';
    ctx.titleEl.textContent = 'Watch Party';
    ctx.backButton.hidden = true;
    ctx.searchInput.hidden = true;
    ctx.seasonTabs.hidden = true;
    ctx.setStatus('');
    ctx.resultsList.innerHTML = '';
    ctx.resultsList.className = 'watch-party-choice-list';

    const newParty = createElement('li', { className: 'watch-party-choice-item' },
      createElement('button', {
        className: 'watch-party-choice-button',
        type: 'button',
        onClick: () => (item ? ctx.startFor(item) : ctx.showPickMediaView())
      },
        createElement('span', { className: 'watch-party-choice-title' }, 'Neue Watch Party starten'),
        createElement('span', { className: 'watch-party-choice-meta' }, item?.Name || 'Film oder Serie auswählen')
      )
    );
    ctx.resultsList.append(
      createElement('li', { className: 'watch-party-choice-heading' }, 'Weiterschauen'),
      ...ctx.liveParties.map(renderParty),
      newParty
    );
    ctx.resultsList.querySelector('button:not([disabled])')?.focus({ preventScroll: true });
  };

  return ctx;
}
