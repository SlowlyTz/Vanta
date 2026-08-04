import { createElement } from '../../../utils/dom.js';
import { RequestsApi } from '../../../api/requests.api.js';
import { STATUS_MAP, getTmdbImageUrl } from '../../../pages/requests/helpers.js';

const TYPE_LABELS = { movie: 'Film', tv: 'Serie' };

function formatRequestDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Eine Zeile in der Admin-Anfragenliste: Poster-Thumbnail, Titel, Nutzer, Typ
// und Anfragedatum. Im "Alle"-Tab (showStatus) kommt zusätzlich ein
// Status-Badge dazu; Genehmigen/Ablehnen gibt es nur, solange die Anfrage
// noch offen ist.
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

  const meta = createElement('div', { className: 'admin-request-item-meta' },
    createElement('span', { className: 'admin-request-item-user' }, request.username),
    createElement('span', { className: 'admin-request-item-type' }, typeLabel),
    dateLabel ? createElement('span', { className: 'admin-request-item-date' }, dateLabel) : null
  );

  const info = createElement('div', { className: 'admin-request-item-info' },
    createElement('span', { className: 'admin-request-item-title' }, request.title || `TMDB: ${request.tmdb_id}`),
    meta
  );

  if (showStatus) {
    const statusInfo = STATUS_MAP[request.status] || { label: request.status, cls: 'unknown' };
    info.appendChild(
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
    }, 'Genehmigen');

    const rejectBtn = createElement('button', {
      className: 'request-admin-action request-reject',
      type: 'button',
      title: 'Anfrage ablehnen — der Titel wandert danach auf die Sperrliste und kann nicht erneut angefragt werden',
      onClick: async (e) => {
        e.stopPropagation();
        setBusy(true);
        try {
          await RequestsApi.rejectRequest(request.id);
          onNotify?.(`„${request.title}“ abgelehnt — landet auf der Sperrliste und kann nicht erneut angefragt werden`, 'success');
          onChange?.();
        } catch (error) {
          console.error('Failed to reject request:', error);
          onNotify?.(error.message || 'Ablehnen fehlgeschlagen', 'error');
          setBusy(false);
        }
      }
    }, 'Ablehnen');

    actions.appendChild(approveBtn);
    actions.appendChild(rejectBtn);
  }

  return createElement('div', { className: 'admin-request-item' },
    poster,
    info,
    actions
  );
}
