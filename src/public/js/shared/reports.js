// Problem reports: what can be reported, their states and the German labels.
// Shared by the report page, the admin area and the server (validation,
// Discord webhook).

export const REPORT_PROBLEMS = [
  { key: 'no-german', label: 'Keine deutsche Tonspur', hint: 'Nur in einer anderen Sprache verfügbar' },
  { key: 'bad-quality', label: 'Schlechte Auflösung', hint: 'Unscharf, verpixelt oder falsches Format' },
  { key: 'playback', label: 'Probleme beim Abspielen', hint: 'Startet nicht, bricht ab oder ruckelt' },
  { key: 'other', label: 'Anderes', hint: 'Beschreibe das Problem selbst' }
];

export const REPORT_PROBLEM_KEYS = REPORT_PROBLEMS.map(problem => problem.key);
export const REPORT_SCOPES = ['all', 'season', 'episode'];
export const REPORT_STATUSES = ['open', 'resolved', 'dismissed'];
export const REPORT_MESSAGE_MAX = 1000;

export const REPORT_STATUS_LABELS = {
  open: 'Offen',
  resolved: 'Erledigt',
  dismissed: 'Verworfen'
};

export function getProblemLabel(key) {
  return REPORT_PROBLEMS.find(problem => problem.key === key)?.label || 'Problem';
}

const pad2 = value => String(value).padStart(2, '0');

// "Film", "Ganze Serie", "Staffel 2" or "S02E05 · Name".
export function getReportScopeLabel(report = {}) {
  if (report.item_type === 'Movie') return 'Film';
  const scope = report.report_scope || 'all';
  if (scope === 'season' && Number.isInteger(report.season_number)) return `Staffel ${report.season_number}`;
  if (scope === 'episode' && Number.isInteger(report.season_number) && Number.isInteger(report.episode_number)) {
    const code = `S${pad2(report.season_number)}E${pad2(report.episode_number)}`;
    return report.episode_name ? `${code} · ${report.episode_name}` : code;
  }
  return 'Ganze Serie';
}
