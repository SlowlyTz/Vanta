// The facts under the detail title (ratings, age rating, picture and sound,
// when a film would end) and the version choice of a film held twice.
import { createElement } from '../../utils/dom.js';
import { detailChip } from '../../components/detailView.js';
import { versionOptions } from '../../utils/versions.js';

const TICKS_PER_MINUTE = 60 * 10_000_000;

const ratingText = (value) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);

// "Endet um 22:41": now plus what is left to watch (a started film counts
// from its position). Null without a runtime.
export function endsAt(item, now = new Date()) {
  const runtime = Number(item?.RunTimeTicks) || 0;
  if (runtime <= 0) return null;
  const position = item.UserData?.Played ? 0 : Number(item.UserData?.PlaybackPositionTicks) || 0;
  const leftMinutes = Math.max(1, Math.round((runtime - position) / TICKS_PER_MINUTE));
  const end = new Date(now.getTime() + leftMinutes * 60_000);
  return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(end);
}

export function buildChips(item, normalized, media = normalized.media) {
  const chips = [];
  if (normalized.rating) chips.push(detailChip({ icon: 'star', label: 'TMDB', value: ratingText(normalized.rating), tone: 'is-rating', title: 'Bewertung der Zuschauer bei TMDB' }));
  if (normalized.criticRating) chips.push(detailChip({ icon: 'critic', value: `${normalized.criticRating} %`, tone: 'is-critic', title: 'Kritiker (Rotten Tomatoes)' }));
  if (normalized.fsk) chips.push(detailChip({ icon: 'age', value: normalized.fsk.replace(/^DE-/, 'FSK ').replace(/^FSK-/, 'FSK '), title: 'Altersfreigabe' }));
  if (media?.resolution) chips.push(detailChip({ value: media.resolution, tone: 'is-tech' }));
  if (media?.dynamicRange) chips.push(detailChip({ value: media.dynamicRange, tone: 'is-tech' }));
  if (media?.audio) chips.push(detailChip({ value: media.audio, tone: 'is-tech' }));
  if (item.Type === 'Movie') {
    const end = endsAt(item);
    if (end) chips.push(detailChip({ label: 'Endet um', value: end, tone: 'is-ends' }));
  }
  return chips;
}

// One button per version of a film; `onChange(id, copy)` when another is
// chosen. Null for a film held once.
export function buildVersionPicker(item, { onChange }) {
  const copies = item.Type === 'Movie' && Array.isArray(item.VantaCopies) ? item.VantaCopies : [];
  if (copies.length < 2) return null;
  const options = versionOptions(copies, item.Id);
  const buttons = options.map(option => createElement('button', {
    type: 'button',
    className: `detail-version${option.selected ? ' is-selected' : ''}`,
    role: 'radio',
    'aria-checked': option.selected ? 'true' : 'false',
    dataset: { tvKey: `version-${option.id}` },
    onClick: (event) => {
      buttons.forEach(button => {
        const chosen = button === event.currentTarget;
        button.classList.toggle('is-selected', chosen);
        button.setAttribute('aria-checked', chosen ? 'true' : 'false');
      });
      onChange?.(option.id, copies.find(copy => copy.Id === option.id));
    }
  }, option.label));
  return createElement('div', { className: 'detail-versions' },
    createElement('span', { className: 'detail-versions-label', id: 'detail-versions-label' }, 'Version'),
    createElement('div', { className: 'detail-versions-list', role: 'radiogroup', 'aria-labelledby': 'detail-versions-label', 'data-tv-row': '' }, buttons)
  );
}
