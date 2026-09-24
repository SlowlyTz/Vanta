import { createElement } from '../../../utils/dom.js';
import { MediaApi } from '../../../api/media.api.js';
import { WatchPartyApi } from '../../../api/watch-party.api.js';

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
    const season = String(snapshot.seasonNumber ?? 1).padStart(2, '0');
    const episode = String(snapshot.episodeNumber ?? 1).padStart(2, '0');
    return `${snapshot.seriesName} · S${season}E${episode}`;
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

// "Zuletzt dabei": parties the user was in that still run, above the choice
// of a new party. Hidden while picking an episode and when there are none.
export function bindRecentParties(ctx) {
  ctx.recentParties = [];
  ctx.recentList = createElement('ul', { className: 'watch-party-recent-list' });
  ctx.recentSection = createElement('section', { className: 'watch-party-recent', hidden: true, 'aria-label': 'Zuletzt dabei' },
    createElement('h3', { className: 'watch-party-recent-title' }, 'Zuletzt dabei'),
    ctx.recentList
  );
  ctx.dialog.insertBefore(ctx.recentSection, ctx.searchInput);

  const joinParty = party => {
    ctx.setOpen(false);
    window.location.hash = `#/watch-party/${party.id}`;
  };

  const renderItem = party => {
    const backdrop = party.itemSnapshot?.backdrop;
    const thumb = createElement('span', { className: 'watch-party-recent-thumb', 'aria-hidden': 'true' });
    if (backdrop?.id) {
      thumb.style.backgroundImage = `url("${MediaApi.getImageUrl(backdrop.id, 'Backdrop', 320, { tag: backdrop.tag, quality: 80 })}")`;
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
        'aria-label': party.full ? 'Watch Party ist voll' : `${recentPartyTitle(party.itemSnapshot)} beitreten`,
        onClick: () => joinParty(party)
      }, party.full ? 'Voll' : 'Beitreten')
    );
  };

  ctx.updateRecentVisibility = () => {
    const topLevel = ctx.currentView === 'pick-media' || ctx.currentView === 'resume-choice';
    ctx.recentSection.hidden = !topLevel || ctx.recentParties.length === 0;
  };

  ctx.loadRecentParties = async () => {
    try {
      const { parties = [] } = await WatchPartyApi.recent();
      if (!ctx.open) return;
      ctx.recentParties = parties;
    } catch (error) {
      console.warn('[Watch Party Recent]', error);
      ctx.recentParties = [];
    }
    ctx.recentList.replaceChildren(...ctx.recentParties.map(renderItem));
    ctx.updateRecentVisibility();
  };

  // Every view change decides whether the section fits.
  ['showPickMediaView', 'showResumeChoice', 'showEpisodePicker'].forEach(name => {
    const show = ctx[name];
    ctx[name] = (...args) => {
      const result = show(...args);
      ctx.updateRecentVisibility();
      return result;
    };
  });

  return ctx;
}
