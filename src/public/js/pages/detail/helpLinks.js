import { createElement } from '../../utils/dom.js';

const FLAG_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"></path><path d="M5 4h11l-2 4 2 4H5"></path></svg>';
const PLUS_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>';

function link(href, icon, label, className) {
  const element = createElement('a', { className: `detail-help-link ${className}`, href });
  element.innerHTML = icon;
  element.appendChild(createElement('span', {}, label));
  return element;
}

// Quiet links below a title's facts: report a problem with it and, for a
// series, request seasons or episodes that are still missing.
export function buildHelpLinks(item) {
  if (item?.Type !== 'Movie' && item?.Type !== 'Series') return null;

  const tmdbId = item.ProviderIds?.Tmdb;
  const links = [
    item.Type === 'Series' && tmdbId
      ? link(`#/request-detail/tv/${encodeURIComponent(tmdbId)}`, PLUS_ICON, 'Weitere Staffeln anfragen', 'detail-help-request')
      : null,
    link(`#/report?item=${encodeURIComponent(item.Id)}`, FLAG_ICON, 'Problem melden', 'detail-help-report')
  ].filter(Boolean);

  return createElement('div', { className: 'detail-help-links' }, ...links);
}
