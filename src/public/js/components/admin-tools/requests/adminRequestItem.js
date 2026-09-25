import { createElement } from '../../../utils/dom.js';
import { RequestsApi } from '../../../api/requests.api.js';
import { STATUS_MAP, getTmdbImageUrl, getScopeLabel, getRequestScope } from '../../../pages/requests/helpers.js';

const TYPE_LABELS = { movie: 'Film', tv: 'Serie' };

const ACTION_ICONS = {
  approve: '<path d="M20 6 9 17l-5-5"></path>',
  reject: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>'
};

function actionIcon(kind) {
  const icon = createElement('span', { className: 'request-admin-action-icon', 'aria-hidden': 'true' });
  icon.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ACTION_ICONS[kind]}</svg>`;
  return icon;
}

function formatRequestDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Eine Zeile in der Admin-Anfragenliste: Poster-Thumbnail, Titel, Nutzer, Typ,
// Umfang der Anfrage (komplette Serie / Staffel / Folge) und Anfragedatum.
// Im "Alle"-Tab (showStatus) kommt zusätzlich ein Status-Badge dazu;
// Genehmigen/Ablehnen gibt es nur, solange die Anfrage noch offen ist.
export function createAdminRequestItem(request, { onChange, onNotify, showStatus = false } = {}) {
  const posterUrl = getTmdbImageUrl(request.poster_path, 'w154');
  const poster = posterUrl
    ? createElement('img', {
      className: 'admin-request-item-poster',
      src: posterUrl,
      alt: '',
      loading: 'lazy'
    })
    : createElement('div', { className: 'admin-request-item-poster admin-request-item-poster-empty' });

  const typeLabel = TYPE_LABELS[request.tmdb_type] || request.tmdb_type;
  const dateLabel = formatRequestDate(request.created_at);

  const dot = () => createElement('span', { className: 'admin-request-item-dot', 'aria-hidden': 'true' }, '·');
  const meta = createElement('div', { className: 'admin-request-item-meta' },
    createElement('span', { className: 'admin-request-item-user' },
      createElement('span', { className: 'admin-request-item-avatar', 'aria-hidden': 'true' },
        (String(request.username || '?').charAt(0) || '?').toUpperCase()),
      request.username
    ),
    dot(),
    createElement('span', { className: 'admin-request-item-type' }, typeLabel),
    dateLabel ? dot() : null,
    dateLabel ? createElement('span', { className: 'admin-request-item-date' }, dateLabel) : null,
    createElement('span', { className: 'admin-request-item-break', 'aria-hidden': 'true' }),
    createElement('span', { className: 'admin-request-item-scope' }, getScopeLabel(request))
  );

  const info = createElement('div', { className: 'admin-request-item-info' },
    createElement('span', { className: 'admin-request-item-title' }, request.title || `TMDB: ${request.tmdb_id}`),
    meta
  );

  // Im "Alle"-Tab steht der Status als zweiter Chip neben dem Umfang.
  if (showStatus) {
    const statusInfo = STATUS_MAP[request.status] || { label: request.status, cls: 'unknown' };
    meta.appendChild(
      createElement('span', { className: `request-status request-status-${statusInfo.cls}` }, statusInfo.label)
    );
  }

  const actions = createElement('div', { className: 'admin-request-item-actions' });

  if (request.status === 'pending') {
    const setBusy = (busy) => {
      approveBtn.disabled = busy;
      rejectBtn.disabled = busy;
    };

    const approveBtn = createElement('button', {
      className: 'request-admin-action request-approve',
      type: 'button',
      title: 'Anfrage genehmigen',
      onClick: async (e) => {
        e.stopPropagation();
        setBusy(true);
        try {
          await RequestsApi.approveRequest(request.id);
          onNotify?.(`„${request.title}“ genehmigt`, 'success');
          onChange?.();
        } catch (error) {
          console.error('Failed to approve request:', error);
          onNotify?.(error.message || 'Genehmigen fehlgeschlagen', 'error');
          setBusy(false);
        }
      }
    }, actionIcon('approve'), createElement('span', {}, 'Genehmigen'));

    // Nur eine abgelehnte Gesamtanfrage sperrt den Titel; eine einzelne Staffel
    // oder Folge kann danach erneut angefragt werden (requests.service.js).
    const bansTitle = getRequestScope(request) === 'all';
    const rejectHint = bansTitle
      ? 'Anfrage ablehnen — der Titel wandert danach auf die Sperrliste und kann nicht erneut angefragt werden'
      : `Anfrage ablehnen — betrifft nur ${getScopeLabel(request)}, der Titel bleibt anfragbar`;

    const rejectBtn = createElement('button', {
      className: 'request-admin-action request-reject',
      type: 'button',
      title: rejectHint,
      onClick: async (e) => {
        e.stopPropagation();
        setBusy(true);
        try {
          await RequestsApi.rejectRequest(request.id);
          onNotify?.(bansTitle
            ? `„${request.title}“ abgelehnt — landet auf der Sperrliste und kann nicht erneut angefragt werden`
            : `${getScopeLabel(request)} von „${request.title}“ abgelehnt — kann erneut angefragt werden`, 'success');
          onChange?.();
        } catch (error) {
          console.error('Failed to reject request:', error);
          onNotify?.(error.message || 'Ablehnen fehlgeschlagen', 'error');
          setBusy(false);
        }
      }
    }, actionIcon('reject'), createElement('span', {}, 'Ablehnen'));

    actions.appendChild(approveBtn);
    actions.appendChild(rejectBtn);
  }

  return createElement('div', { className: `admin-request-item${actions.childElementCount ? ' has-actions' : ''}` },
    poster,
    info,
    actions
  );
}
