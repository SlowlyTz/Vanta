// Context menu of a media card or the hero (long press, right click, menu key).
// It opens at once from what the card shows and fills in its states once the
// title's current data (progress, list) has arrived.
import { createElement } from '../utils/dom.js';
import { MediaApi } from '../api/media.api.js';
import { appStore } from '../store/app.store.js';
import { watchlistStore } from '../store/watchlist.store.js';
import { openModal } from '../utils/modal.js';
import { bindSheetSwipe } from '../utils/sheetSwipe.js';
import { bindContextAction } from '../utils/longPress.js';
import { confirmDialog } from './confirmDialog.js';
import { PLAYED_CHANGED_EVENT } from './playedToggle.js';
import { copyText } from '../utils/clipboard.js';

export const MEDIA_ACTION_TARGETS = '.media-card[data-item-id], [data-media-actions][data-item-id]';
export const OPEN_WATCH_PARTY_EVENT = 'vanta:open-watch-party';
const SHEET_QUERY = '(max-width: 600px)';

const ICONS = {
  resume: '<path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/>',
  add: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z"/><path d="M12 8v6M9 11h6"/>',
  remove: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z"/><path d="M9 11h6"/>',
  hide: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="m9 9 6 6M15 9l-6 6"/>',
  share: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  details: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8h.01"/>',
  played: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  party: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c3 0 6 1.8 6 5"/>'
};

const icon = name => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

// What a share puts on the clipboard: always the detail page, of the series
// for an episode.
export function shareText(item, origin = window.location.origin) {
  const isEpisode = item.Type === 'Episode' && item.SeriesId;
  const id = isEpisode ? item.SeriesId : item.Id;
  const name = isEpisode ? (item.SeriesName || item.Name) : item.Name;
  return `Schau „${name}“ auf VANTA: ${origin}/#/item/${id}`;
}

const hasProgress = item => Number(item?.UserData?.PlaybackPositionTicks) > 0;

// Jellyfin's "next up" also names the first episode of a series nobody
// started; only a series with something watched counts as started.
const seriesStarted = (series, episode) =>
  Number(series.UserData?.PlayedPercentage) > 0
  || hasProgress(episode)
  || Boolean(episode.UserData?.LastPlayedDate)
  || (Number(series.RecursiveItemCount) > 0 && Number(series.UserData?.UnplayedItemCount) < Number(series.RecursiveItemCount));

// The menu entries for a title. `item` is null while its data loads; then
// only what needs no data is usable. Exported for the tests.
export function buildMenuEntries({ item, cardInfo, nextUp = undefined }) {
  const type = item?.Type || cardInfo.type;
  const listId = type === 'Episode' ? item?.SeriesId : (item?.Id || cardInfo.id);
  const listable = type === 'Movie' || type === 'Series' || (type === 'Episode' && Boolean(item?.SeriesId));
  const onList = listId ? watchlistStore.has(listId) : false;

  // Started: "Weiterschauen" where one left off; not started: "Abspielen"
  // from the beginning (a series from its first episode).
  let resume = { disabled: true, hint: 'Wird geladen …' };
  if (item) {
    if (type === 'Series') {
      resume = nextUp === undefined
        ? { disabled: true, hint: 'Wird geladen …' }
        : nextUp && seriesStarted(item, nextUp)
          ? { disabled: false, hint: formatEpisodeHint(nextUp), targetId: nextUp.Id }
          : { label: 'Abspielen', disabled: false, hint: null, targetId: item.Id };
    } else if (hasProgress(item) || cardInfo.inResumeRow) {
      resume = { disabled: false, hint: hasProgress(item) ? progressHint(item) : null, targetId: item.Id };
    } else {
      resume = { label: 'Abspielen', disabled: false, hint: null, targetId: item.Id };
    }
  }

  const playedKnown = Boolean(item);
  const played = item?.UserData?.Played === true;

  return [
    { id: 'resume', label: 'Weiterschauen', icon: 'resume', ...resume },
    listable ? { id: 'watchlist', label: onList ? 'Aus meiner Liste entfernen' : 'Zu meiner Liste hinzufügen', icon: onList ? 'remove' : 'add', disabled: !listId, listId, onList } : null,
    cardInfo.inResumeRow ? { id: 'hide', label: 'Aus „Weiter schauen“ entfernen', icon: 'hide', disabled: !item } : null,
    { id: 'share', label: 'Teilen', icon: 'share', disabled: !item },
    { id: 'details', label: 'Details', icon: 'details' },
    playedKnown ? { id: 'played', label: played ? 'Als ungesehen markieren' : 'Als gesehen markieren', icon: 'played', played } : null,
    { id: 'party', label: 'Watch Party starten', icon: 'party', disabled: !item }
  ].filter(Boolean);
}

function formatEpisodeHint(episode) {
  const season = episode.ParentIndexNumber;
  const number = episode.IndexNumber;
  return Number.isFinite(season) && Number.isFinite(number) ? `S${season} E${number}` : null;
}

function progressHint(item) {
  const runtime = Number(item.RunTimeTicks);
  const position = Number(item.UserData.PlaybackPositionTicks);
  if (!(runtime > 0)) return null;
  const left = Math.max(1, Math.round((runtime - position) / 600_000_000));
  return `noch ${left} Min.`;
}

function readCard(target) {
  const image = target.querySelector('img');
  return {
    id: target.dataset.itemId,
    type: target.dataset.itemType || null,
    title: target.dataset.itemTitle || target.querySelector('.media-card-title')?.textContent || image?.alt || '',
    image: image?.currentSrc || image?.src || null,
    inResumeRow: Boolean(target.closest('[data-resume-row]'))
  };
}

// Titles taken out of "Weiter schauen" during this visit: a home page shown
// again from its saved state leaves them out.
export const hiddenResumeIds = new Set();

// Where the focus goes when the focused card leaves (a TV has no pointer to
// fall back on): the next card of the row, else the one before, else the
// first card of a neighbouring row.
function focusAfterRemoval(slot, row) {
  const focusable = element => element?.querySelector?.('[data-item-id]') || null;
  const sibling = slot.nextElementSibling || slot.previousElementSibling;
  let next = focusable(sibling);
  if (!next && row) {
    const rows = [...document.querySelectorAll('.media-carousel-container')].filter(other => other !== row && !other.hidden);
    const after = rows.find(other => row.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING);
    next = focusable(after) || focusable(rows.reverse().find(other => row.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_PRECEDING));
  }
  next?.focus?.({ preventScroll: false });
}

// Takes a card out of its row with a short fade; undo puts it back. A row
// left without cards goes as well (and comes back with the undo).
export function removeCard(target) {
  const slot = target.closest('.media-carousel-item') || target;
  const parent = slot.parentElement;
  const next = slot.nextSibling;
  const row = slot.closest('.media-carousel-container');
  slot.classList.add('is-removing');
  const timer = window.setTimeout(() => {
    if (slot.contains(document.activeElement)) focusAfterRemoval(slot, row);
    slot.remove();
    if (row && !row.querySelector('.media-carousel-item')) row.hidden = true;
  }, 260);
  return () => {
    window.clearTimeout(timer);
    slot.classList.remove('is-removing');
    if (!slot.isConnected && parent) parent.insertBefore(slot, next);
    if (row) row.hidden = false;
  };
}

export function openMediaActions(target, point = {}, { loadItem = id => MediaApi.getItem(id) } = {}) {
  const cardInfo = readCard(target);
  if (!cardInfo.id) return null;

  let item = null;
  let nextUp;
  let handle = null;
  const sheet = window.matchMedia?.(SHEET_QUERY).matches === true;
  const popover = !sheet && point.source === 'mouse';

  const list = createElement('div', { className: 'media-actions-list', role: 'menu' });
  const header = createElement('div', { className: 'media-actions-head' },
    cardInfo.image ? createElement('img', { className: 'media-actions-poster', src: cardInfo.image, alt: '' }) : null,
    createElement('strong', { className: 'media-actions-title' }, cardInfo.title)
  );
  const dialog = createElement('div', {
    className: `media-actions${sheet ? ' is-sheet' : ''}${popover ? ' is-popover' : ''}`,
    'aria-label': `Aktionen für ${cardInfo.title}`
  }, sheet ? createElement('span', { className: 'media-actions-grip', 'aria-hidden': 'true' }) : null, header, list);
  const overlay = createElement('div', { className: `media-actions-backdrop${popover ? ' is-clear' : ''}` }, dialog);

  const close = () => handle?.close();

  const run = async entry => {
    switch (entry.id) {
      case 'resume':
        close();
        window.location.hash = `#/player/${entry.targetId}`;
        return;
      case 'details':
        close();
        window.location.hash = `#/item/${cardInfo.id}`;
        return;
      case 'watchlist':
        close();
        try {
          const saved = await watchlistStore.toggle(entry.listId);
          appStore.showToast(saved ? 'Zu meiner Liste hinzugefügt' : 'Aus meiner Liste entfernt', 'success');
        } catch (error) {
          appStore.showToast(error.message || 'Meine Liste konnte nicht geändert werden', 'error');
        }
        return;
      case 'share':
        close();
        try {
          await copyText(shareText(item));
          appStore.showToast('Link kopiert', 'success');
        } catch {
          appStore.showToast('Link konnte nicht kopiert werden', 'error');
        }
        return;
      case 'hide': {
        close();
        const putBack = removeCard(target);
        try {
          const { undo } = await MediaApi.removeFromResume(item.Id);
          hiddenResumeIds.add(item.Id);
          appStore.showToast('Aus „Weiter schauen“ entfernt', 'success', {
            action: {
              label: 'Rückgängig',
              onClick: async () => {
                putBack();
                hiddenResumeIds.delete(item.Id);
                try {
                  await MediaApi.restoreResume(undo);
                } catch {
                  appStore.showToast('Konnte nicht rückgängig gemacht werden', 'error');
                }
              }
            }
          });
        } catch (error) {
          putBack();
          appStore.showToast(error.message || 'Konnte nicht entfernt werden', 'error');
        }
        return;
      }
      case 'played': {
        close();
        const next = !entry.played;
        const confirmed = await confirmDialog({
          title: next ? 'Als gesehen markieren?' : 'Als ungesehen markieren?',
          message: `„${cardInfo.title}“ ${next ? 'als gesehen' : 'als ungesehen'} markieren?`
        });
        if (!confirmed) return;
        try {
          if (next) await MediaApi.markPlayed(item.Id);
          else await MediaApi.markUnplayed(item.Id);
          target.classList.toggle('is-played', next);
          window.dispatchEvent(new CustomEvent(PLAYED_CHANGED_EVENT, { detail: { id: item.Id, played: next } }));
          appStore.showToast(next ? 'Als gesehen markiert' : 'Als ungesehen markiert', 'success');
        } catch {
          appStore.showToast('Status konnte nicht geändert werden', 'error');
        }
        return;
      }
      case 'party':
        close();
        window.dispatchEvent(new CustomEvent(OPEN_WATCH_PARTY_EVENT, { detail: { item } }));
        return;
      default:
    }
  };

  const render = () => {
    const focusedId = document.activeElement?.closest?.('.media-actions-item')?.dataset.action;
    list.replaceChildren(...buildMenuEntries({ item, cardInfo, nextUp }).map(entry => {
      const button = createElement('button', {
        type: 'button',
        className: 'media-actions-item',
        role: 'menuitem',
        disabled: Boolean(entry.disabled),
        dataset: { action: entry.id },
        onClick: () => run(entry)
      });
      button.innerHTML = `<span class="media-actions-icon">${icon(entry.icon)}</span><span class="media-actions-label"></span>${entry.hint ? '<span class="media-actions-hint"></span>' : ''}`;
      button.querySelector('.media-actions-label').textContent = entry.label;
      if (entry.hint) button.querySelector('.media-actions-hint').textContent = entry.hint;
      return button;
    }));
    // The re-render replaced the focused entry: focus moves to the same one
    // once the user moved it, else to the first usable one (which may have
    // just become usable).
    if (!dialog.isConnected || dialog.contains(document.activeElement)) return;
    const target = (userMoved && focusedId && list.querySelector(`[data-action="${focusedId}"]:not([disabled])`))
      || list.querySelector('.media-actions-item:not([disabled])');
    target?.focus({ preventScroll: true });
  };

  // Arrow keys move through the entries.
  let userMoved = false;
  list.addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    userMoved = true;
    event.preventDefault();
    const items = [...list.querySelectorAll('.media-actions-item:not([disabled])')];
    const index = items.indexOf(document.activeElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    items[(index + step + items.length) % items.length]?.focus();
  });

  render();
  if (popover) {
    // Placed at the pointer, kept inside the window.
    dialog.style.visibility = 'hidden';
    document.body.appendChild(overlay);
    const { offsetWidth: width, offsetHeight: height } = dialog;
    const left = Math.min(Math.max(8, point.x ?? 0), window.innerWidth - width - 8);
    const top = Math.min(Math.max(8, point.y ?? 0), window.innerHeight - height - 8);
    Object.assign(dialog.style, { left: `${left}px`, top: `${top}px`, visibility: '' });
  }

  let unbindSwipe = null;
  handle = openModal({
    overlay,
    dialog,
    initialFocus: '.media-actions-item:not([disabled])',
    lockScroll: !popover,
    onClose: () => unbindSwipe?.()
  });
  if (sheet) unbindSwipe = bindSheetSwipe({ sheet: dialog, backdrop: overlay, onDismiss: close });

  const unsubscribe = watchlistStore.subscribe(() => { if (handle.isOpen) render(); });
  const previousOnClose = handle.close;
  handle.close = () => { unsubscribe(); previousOnClose(); };

  loadItem(cardInfo.id).then(loaded => {
    item = loaded;
    if (!handle.isOpen) return;
    render();
    if (item?.Type === 'Series') {
      MediaApi.getNextUp(item.Id)
        .then(result => { nextUp = result?.episode || null; })
        .catch(() => { nextUp = null; })
        .finally(() => { if (handle.isOpen) render(); });
    }
  }).catch(() => {
    if (!handle.isOpen) return;
    list.prepend(createElement('p', { className: 'media-actions-error', role: 'alert' }, 'Der Titel konnte nicht geladen werden.'));
  });

  return handle;
}

// Once for the whole app: every media card and the hero take part.
export function initMediaActions(root = document) {
  return bindContextAction(root, MEDIA_ACTION_TARGETS, (target, point) => openMediaActions(target, point));
}
