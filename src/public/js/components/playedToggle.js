import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { appStore } from '../store/app.store.js';

export const PLAYED_CHANGED_EVENT = 'vanta:item-played-changed';

const MARK_PLAYED_LABEL = 'Als gesehen markieren';
const MARK_UNPLAYED_LABEL = 'Als ungesehen markieren';

const CHECK_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>`;

// The same toggle Jellyfin offers: a check that marks an item played or
// unplayed. Optimistic like the favourite heart, reverted when the request
// fails. `compact` is the icon-only variant that sits on episode cards.
export function createPlayedToggle(item, { compact = false, onChange = null } = {}) {
  let played = item?.UserData?.Played === true;
  let pending = false;

  const label = createElement('span', { className: 'played-toggle-label' });
  const button = createElement('button', {
    type: 'button',
    className: `played-toggle${compact ? ' compact' : ''}`,
    onClick: async (event) => {
      event.stopPropagation();
      if (pending) return;

      pending = true;
      const next = !played;
      apply(next);

      try {
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
    label.textContent = value ? 'Gesehen' : MARK_PLAYED_LABEL;
  };

  button.innerHTML = CHECK_ICON;
  if (!compact) button.appendChild(label);
  apply(played);

  return button;
}
