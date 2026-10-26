// Played/unplayed check button as Jellyfin offers it, asked with a yes/no dialog first.
import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { appStore } from '../store/app.store.js';
import { confirmDialog } from './confirmDialog.js';
import { getCurrentPageScope } from '../utils/pageScope.js';

export const PLAYED_CHANGED_EVENT = 'vanta:item-played-changed';

const MARK_PLAYED_LABEL = 'Als gesehen markieren';
const MARK_UNPLAYED_LABEL = 'Als ungesehen markieren';

const CHECK_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>`;

const ITEM_WORDS = {
  Movie: { noun: 'diesen Film', short: 'Film' },
  Series: { noun: 'diese Serie', short: 'Serie' },
  Episode: { noun: 'diese Folge', short: 'Folge' }
};

const questionFor = (item, next) => {
  const words = ITEM_WORDS[item?.Type] || { noun: 'diesen Titel', short: 'Titel' };
  return {
    title: next ? `${words.short} als gesehen markieren?` : `${words.short} als ungesehen markieren?`,
    message: next
      ? `Willst du ${words.noun} als gesehen markieren?`
      : `Willst du ${words.noun} als ungesehen markieren?`
  };
};

// Optimistic, reverted when the request fails. `compact` is the variant on
// episode cards. Changes made elsewhere (the series above an episode, the
// context menu) arrive through PLAYED_CHANGED_EVENT.
export function createPlayedToggle(item, { compact = false, withLabel = false, onChange = null, confirm = confirmDialog } = {}) {
  let played = item?.UserData?.Played === true;
  let pending = false;

  const button = createElement('button', {
    type: 'button',
    className: `played-toggle${compact ? ' compact' : ''}${withLabel ? ' has-label' : ''}`,
    onClick: async (event) => {
      event.stopPropagation();
      if (pending) return;

      pending = true;
      const next = !played;
      try {
        const confirmed = await confirm(questionFor(item, next));
        if (!confirmed) return;

        apply(next);
        if (next) {
          await MediaApi.markPlayed(item.Id);
          appStore.showToast('Als gesehen markiert', 'success');
        } else {
          await MediaApi.markUnplayed(item.Id);
          appStore.showToast('Als ungesehen markiert', 'success');
        }
        onChange?.(next);
        window.dispatchEvent(new CustomEvent(PLAYED_CHANGED_EVENT, { detail: { id: item.Id, played: next } }));
      } catch (error) {
        console.error('[Played Toggle Error]', error);
        apply(!next);
        appStore.showToast('Status konnte nicht aktualisiert werden', 'error');
      } finally {
        pending = false;
      }
    }
  });

  const apply = (value) => {
    played = value;
    if (item.UserData) {
      item.UserData.Played = value;
      if (value) item.UserData.PlaybackPositionTicks = 0;
    } else {
      item.UserData = { Played: value };
    }
    const text = value ? MARK_UNPLAYED_LABEL : MARK_PLAYED_LABEL;
    button.setAttribute('aria-pressed', String(value));
    button.setAttribute('aria-label', text);
    button.title = text;
    if (label) label.textContent = value ? 'Gesehen' : 'Als gesehen markieren';
  };

  // The detail page names the state next to the check; the title says
  // what a click does.
  const label = withLabel ? createElement('span', { className: 'played-toggle-label' }) : null;
  button.innerHTML = CHECK_ICON;
  if (label) button.appendChild(label);
  apply(played);

  const onChangedElsewhere = (event) => {
    const detail = event.detail || {};
    if (detail.id !== item?.Id || pending || detail.played === played) return;
    apply(detail.played === true);
  };
  window.addEventListener(PLAYED_CHANGED_EVENT, onChangedElsewhere);
  getCurrentPageScope()?.onLeave(() => window.removeEventListener(PLAYED_CHANGED_EVENT, onChangedElsewhere));

  return button;
}
