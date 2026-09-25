import { createElement } from '../../../utils/dom.js';
import { MediaApi } from '../../../api/media.api.js';
import { ReportsApi } from '../../../api/reports.api.js';
import { getProblemLabel, getReportScopeLabel, REPORT_STATUS_LABELS } from '../../../shared/reports.js';

const STATUS_CLASS = { open: 'pending', resolved: 'approved', dismissed: 'rejected' };

const ICONS = {
  alert: '<path d="M12 3 2 20h20L12 3z"></path><path d="M12 10v4"></path><path d="M12 17h.01"></path>',
  check: '<path d="M20 6 9 17l-5-5"></path>',
  dismiss: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>'
};

const icon = (key, className = 'request-admin-action-icon') => {
  const element = createElement('span', { className, 'aria-hidden': 'true' });
  element.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[key]}</svg>`;
  return element;
};

const formatDate = value => new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

// A problem report in the admin list. Red "Problem" marker, the problem and
// what it concerns, the reporter's words, and "Erledigt" / "Verwerfen" while
// it is open. The reporter sees the decision on their Meldung page.
export function createAdminReportItem(report, { onChange, onNotify, showStatus = false } = {}) {
  const dot = () => createElement('span', { className: 'admin-request-item-dot', 'aria-hidden': 'true' }, '·');

  const meta = createElement('div', { className: 'admin-request-item-meta' },
    createElement('span', { className: 'admin-request-item-user' },
      createElement('span', { className: 'admin-request-item-avatar', 'aria-hidden': 'true' },
        (String(report.username || '?').charAt(0) || '?').toUpperCase()),
      report.username || 'Unbekannt'
    ),
    dot(),
    createElement('span', {}, getReportScopeLabel(report)),
    dot(),
    createElement('span', { className: 'admin-request-item-date' }, formatDate(report.created_at)),
    createElement('span', { className: 'admin-request-item-break', 'aria-hidden': 'true' }),
    createElement('span', { className: 'admin-report-problem' }, getProblemLabel(report.problem))
  );
  if (showStatus) {
    meta.appendChild(createElement('span', {
      className: `request-status request-status-${STATUS_CLASS[report.status] || 'unknown'}`
    }, REPORT_STATUS_LABELS[report.status] || report.status));
  }

  const info = createElement('div', { className: 'admin-request-item-info' },
    createElement('span', { className: 'admin-item-kind admin-item-kind-report' }, icon('alert', 'admin-item-kind-icon'), 'Problem'),
    createElement('span', { className: 'admin-request-item-title' }, report.title),
    meta,
    report.message ? createElement('p', { className: 'admin-report-message' }, report.message) : null
  );

  const actions = createElement('div', { className: 'admin-request-item-actions' });

  if (report.status === 'open') {
    const act = (run, done, failed) => async () => {
      resolveBtn.disabled = true;
      dismissBtn.disabled = true;
      try {
        await run(report.id);
        onNotify?.(done, 'success');
        onChange?.();
      } catch (error) {
        onNotify?.(error.message || failed, 'error');
        resolveBtn.disabled = false;
        dismissBtn.disabled = false;
      }
    };

    const resolveBtn = createElement('button', {
      className: 'request-admin-action request-approve admin-report-resolve',
      type: 'button',
      title: 'Problem behoben — der Nutzer sieht „Erledigt“',
      onClick: act(ReportsApi.resolve, `Meldung zu „${report.title}“ erledigt`, 'Konnte nicht gespeichert werden')
    }, icon('check'), createElement('span', {}, 'Erledigt'));

    const dismissBtn = createElement('button', {
      className: 'request-admin-action admin-report-dismiss',
      type: 'button',
      title: 'Kein Problem gefunden — der Nutzer sieht „Verworfen“',
      onClick: act(ReportsApi.dismiss, `Meldung zu „${report.title}“ verworfen`, 'Konnte nicht gespeichert werden')
    }, icon('dismiss'), createElement('span', {}, 'Verwerfen'));

    actions.append(resolveBtn, dismissBtn);
  }

  return createElement('div', { className: `admin-request-item admin-report-item${actions.childElementCount ? ' has-actions' : ''}` },
    createElement('img', {
      className: 'admin-request-item-poster',
      src: MediaApi.getImageUrl(report.item_id, 'Primary', 160),
      alt: '',
      loading: 'lazy'
    }),
    info,
    actions
  );
}
