import { createElement } from '../../utils/dom.js';
import { MediaApi } from '../../api/media.api.js';
import { getProblemLabel, getReportScopeLabel, REPORT_STATUS_LABELS } from '../../shared/reports.js';

const STATUS_CHIP = { open: 'ui-chip-warning', resolved: 'ui-chip-success', dismissed: 'ui-chip-muted' };

const formatDate = value => new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

// The user's reports with their state; handled ones since the last visit
// carry a "Neu" mark.
export function renderMyReports(container, reports, { previousSeenAt = 0 } = {}) {
  container.innerHTML = '';
  if (!reports.length) {
    container.appendChild(createElement('div', { className: 'ui-empty' },
      createElement('strong', {}, 'Noch keine Meldungen'),
      'Wenn mit einem Titel etwas nicht stimmt, melde es über „Neue Meldung“.'
    ));
    return;
  }

  reports.forEach(report => {
    const isNew = report.status !== 'open' && report.updated_at > previousSeenAt;
    container.appendChild(createElement('article', { className: `report-card${isNew ? ' is-new' : ''}` },
      createElement('img', {
        className: 'ui-thumb report-card-thumb',
        src: MediaApi.getImageUrl(report.item_id, 'Primary', 120),
        alt: '',
        loading: 'lazy'
      }),
      createElement('div', { className: 'report-card-body' },
        createElement('div', { className: 'report-card-head' },
          createElement('strong', { className: 'report-card-title' }, report.title),
          isNew ? createElement('span', { className: 'ui-chip ui-chip-accent' }, 'Neu') : null
        ),
        createElement('span', { className: 'ui-row-meta' }, `${getReportScopeLabel(report)} · ${formatDate(report.created_at)}`),
        createElement('div', { className: 'report-card-chips' },
          createElement('span', { className: 'ui-chip ui-chip-danger' }, getProblemLabel(report.problem)),
          createElement('span', { className: `ui-chip ${STATUS_CHIP[report.status] || 'ui-chip-muted'}` }, REPORT_STATUS_LABELS[report.status] || report.status)
        ),
        report.message ? createElement('p', { className: 'report-card-message' }, report.message) : null
      )
    ));
  });
}
