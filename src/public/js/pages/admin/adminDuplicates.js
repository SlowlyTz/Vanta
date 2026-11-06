// "Doppelte Dateien": films held more than once and episodes in more than one
// library, each with the files Jellyfin knows (path, library, size, picture,
// sound, languages), so the admin can decide which copy to delete.
import { createElement } from '../../utils/dom.js';
import { AdminDashboardApi } from '../../api/admin-dashboard.api.js';
import { openAdminLayer } from './adminLayer.js';
import { formatBytes } from './adminDashboard.js';

const formatDate = value => {
  const time = typeof value === 'number' ? value : Date.parse(value || '');
  return Number.isFinite(time)
    ? new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(time))
    : '–';
};

const languages = list => (list?.length ? list.join(', ') : '–');

const fact = (label, value) => createElement('div', { className: 'admin-dup-fact' },
  createElement('dt', {}, label),
  createElement('dd', {}, value || '–'));

function fileCard(file) {
  const picture = [file.resolution, file.dynamicRange, file.videoCodec?.toUpperCase()].filter(Boolean).join(' · ');
  return createElement('div', { className: 'admin-dup-file' },
    createElement('div', { className: 'admin-dup-file-head' },
      createElement('span', { className: 'admin-dup-library' }, file.libraryName || 'Unbekannte Bibliothek'),
      createElement('span', { className: 'admin-dash-muted' }, formatBytes(file.size))
    ),
    createElement('code', { className: 'admin-dup-name', title: file.path || '' }, file.fileName || 'Datei unbekannt'),
    createElement('code', { className: 'admin-dup-folder' }, file.folder || '–'),
    createElement('dl', { className: 'admin-dup-facts' },
      fact('Bild', picture),
      fact('Ton', file.audio),
      fact('Laufzeit', file.runtimeMinutes ? `${file.runtimeMinutes} Min.` : null),
      fact('Container', file.container?.toUpperCase()),
      fact('Tonspuren', languages(file.audioLanguages)),
      fact('Untertitel', languages(file.subtitleLanguages)),
      fact('Hinzugefügt', formatDate(file.addedAt)),
      fact('Jellyfin-ID', file.itemId)
    )
  );
}

const files = list => createElement('div', { className: 'admin-dup-files' }, list.map(fileCard));

// A mismatch is no copy: the files run differently long, so one of them is
// most likely another film that Jellyfin matched to this title.
function movieEntry(entry) {
  return createElement('section', { className: `admin-dup-entry${entry.mismatch ? ' is-mismatch' : ''}` },
    createElement('h3', { className: 'admin-dup-title' }, `${entry.name}${entry.year ? ` (${entry.year})` : ''}`),
    entry.mismatch
      ? createElement('p', { className: 'admin-dup-note' },
        'Vermutlich falsch erkannt: gleiche TMDB-ID, aber unterschiedliche Laufzeit. In Jellyfin den falschen Titel über „Identifizieren“ korrigieren. Bis dahin erscheinen beide getrennt.')
      : createElement('p', { className: 'admin-dash-muted' }, `Film · ${entry.files.length} Dateien · für Zuschauer als Versionen zusammengelegt`),
    files(entry.files)
  );
}

function seriesEntry(entry) {
  const seasons = entry.seasons.map(season => `Staffel ${season}`).join(', ');
  return createElement('section', { className: 'admin-dup-entry' },
    createElement('h3', { className: 'admin-dup-title' }, `${entry.name}${entry.year ? ` (${entry.year})` : ''}`),
    createElement('p', { className: 'admin-dash-muted' },
      `Serie · ${seasons} in mehreren Bibliotheken · ${entry.episodes.length} ${entry.episodes.length === 1 ? 'Folge' : 'Folgen'} doppelt`),
    ...entry.episodes.map(episode => createElement('details', { className: 'admin-dup-episode' },
      createElement('summary', {},
        createElement('strong', {}, `S${String(episode.season).padStart(2, '0')}E${String(episode.episode).padStart(2, '0')}`),
        episode.name ? createElement('span', {}, episode.name) : null,
        createElement('span', { className: 'admin-dash-muted' }, `${episode.files.length} Dateien`)
      ),
      files(episode.files)
    ))
  );
}

// Opens the list as an admin layer; the check itself may take a few seconds.
export function openDuplicatesLayer() {
  const body = createElement('div', { className: 'admin-dup-list' },
    createElement('p', { className: 'admin-dash-muted' }, 'Wird geprüft …'));

  openAdminLayer({
    title: 'Doppelte Dateien',
    subtitle: 'Gleiche Filme oder Folgen in mehr als einer Bibliothek: Für Zuschauer erscheinen sie als ein Titel, Speicher belegen sie doppelt. Dazu Dateien, die Jellyfin vermutlich als falschen Film erkannt hat.',
    content: body,
    wide: true
  });

  AdminDashboardApi.duplicates()
    .then(({ items, checkedAt }) => {
      body.replaceChildren(...(items.length
        ? [
          createElement('p', { className: 'admin-dash-muted' }, `Geprüft am ${formatDate(checkedAt)} · ${items.length} ${items.length === 1 ? 'Titel' : 'Titel'} betroffen`),
          ...items.map(entry => (entry.type === 'Series' ? seriesEntry(entry) : movieEntry(entry)))
        ]
        : [createElement('p', { className: 'admin-dash-muted' }, 'Keine doppelten Dateien gefunden.')]));
    })
    .catch(error => {
      body.replaceChildren(createElement('p', { className: 'admin-dash-muted' }, error.message || 'Prüfung fehlgeschlagen.'));
    });
}
