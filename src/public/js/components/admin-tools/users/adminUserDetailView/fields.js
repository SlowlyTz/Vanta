// Editable fields of the admin user detail view; each reports its value and
// whether it differs from what is saved.
import { createElement } from '../../../../utils/dom.js';
import { segmentedRow } from '../../../settings/controls.js';

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

export function buildRenameField(user) {
  const input = createElement('input', {
    className: 'settings-input',
    type: 'text',
    value: user.name
  });

  return {
    element: createElement('div', { className: 'admin-user-field-group' },
      createElement('label', { className: 'admin-user-field-label' }, 'Benutzername'),
      createElement('div', { className: 'admin-user-field-row' }, input)
    ),
    getValue: () => input.value.trim(),
    hasChanged: () => input.value.trim() !== user.name
  };
}

export function buildPasswordField() {
  const input = createElement('input', {
    className: 'settings-input',
    type: 'password',
    placeholder: 'Leer lassen, um es zu behalten',
    autocomplete: 'new-password'
  });

  return {
    element: createElement('div', { className: 'admin-user-field-group' },
      createElement('label', { className: 'admin-user-field-label' }, 'Neues Passwort'),
      createElement('div', { className: 'admin-user-field-row' }, input)
    ),
    getValue: () => input.value,
    hasChanged: () => input.value.length > 0,
    clear: () => { input.value = ''; }
  };
}

const LIBRARY_GROUPS = [
  { key: 'movies', title: 'Filme', types: ['movies'] },
  { key: 'tvshows', title: 'Serien', types: ['tvshows'] },
  { key: 'other', title: 'Sonstiges', types: null }
];

const LIBRARY_ICONS = {
  movies: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="m7 6-2-4M12 6l-2-4M17 6l-2-4"/>',
  tvshows: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  boxsets: '<path d="M4 7h16v13H4z"/><path d="M7 4h10"/><path d="M9 1h6"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  other: '<path d="M3 7h6l2 2h10v10H3z"/>'
};

const libraryIcon = (type) => {
  const icon = createElement('span', { className: 'admin-library-icon', 'aria-hidden': 'true' });
  icon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${LIBRARY_ICONS[type] || LIBRARY_ICONS.other}</svg>`;
  return icon;
};

const countLabel = (count) => (Number.isFinite(count) ? `${new Intl.NumberFormat('de-DE').format(count)} Titel` : 'Anzahl unbekannt');

// "alle 1 Bibliotheken" reads wrong; with none or one there is no count to give.
export const allLibrariesLabel = (count) => {
  if (count === 0) return 'Sieht alle Bibliotheken.';
  if (count === 1) return 'Sieht alle Bibliotheken (zurzeit eine).';
  return `Sieht alle ${count} Bibliotheken.`;
};

// Which libraries a user sees: everything, or a chosen list grouped by kind
// (films, series, the rest) with how many titles each holds and a few
// posters. `onChange` tells the view something changed (for its save bar).
export function buildLibraryField(user, libraries, { onChange = () => {} } = {}) {
  let enableAll = Boolean(user.enableAllFolders);
  const originalEnabledFolders = new Set(user.enabledFolders || []);
  const selected = new Set(originalEnabledFolders);

  const list = createElement('div', { className: 'admin-library-list' });
  const summary = createElement('p', { className: 'admin-library-summary', role: 'status' });

  const allSwitch = createElement('input', {
    type: 'checkbox',
    role: 'switch',
    className: 'settings-switch-input',
    checked: enableAll,
    'aria-label': 'Zugriff auf alle Bibliotheken',
    onChange: event => {
      enableAll = event.target.checked;
      render();
      onChange();
    }
  });

  const allRow = createElement('label', { className: 'admin-library-all' },
    createElement('span', { className: 'admin-library-all-text' },
      createElement('strong', {}, 'Zugriff auf alle Bibliotheken'),
      createElement('span', {}, 'Auch Bibliotheken, die später dazukommen.')
    ),
    createElement('span', { className: 'settings-switch' }, allSwitch, createElement('span', { className: 'settings-switch-track', 'aria-hidden': 'true' }))
  );

  const bulk = (label, pick) => createElement('button', {
    type: 'button',
    className: 'admin-library-bulk',
    onClick: () => {
      selected.clear();
      if (pick) libraries.forEach(lib => selected.add(lib.id));
      render();
      onChange();
    }
  }, label);
  const bulkRow = createElement('div', { className: 'admin-library-bulk-row' }, bulk('Alle auswählen', true), bulk('Keine', false));

  const renderSummary = () => {
    if (enableAll) {
      summary.textContent = allLibrariesLabel(libraries?.length || 0);
      summary.classList.remove('is-warning');
      return;
    }
    const chosen = libraries.filter(lib => selected.has(lib.id));
    const titles = chosen.reduce((sum, lib) => sum + (Number(lib.itemCount) || 0), 0);
    if (chosen.length === 0) {
      summary.textContent = 'Ohne Bibliothek sieht der Nutzer nichts.';
      summary.classList.add('is-warning');
      return;
    }
    summary.textContent = `Sieht ${chosen.length} von ${libraries.length} ${libraries.length === 1 ? 'Bibliothek' : 'Bibliotheken'} · ${new Intl.NumberFormat('de-DE').format(titles)} Titel`;
    summary.classList.remove('is-warning');
  };

  const row = (lib) => {
    const checkbox = createElement('input', {
      type: 'checkbox',
      className: 'admin-library-check',
      checked: selected.has(lib.id),
      onChange: event => {
        if (event.target.checked) selected.add(lib.id);
        else selected.delete(lib.id);
        renderSummary();
        onChange();
      }
    });
    const previews = createElement('span', { className: 'admin-library-previews', 'aria-hidden': 'true' },
      (lib.previews || []).map(preview => createElement('img', {
        src: `/api/media/image/${encodeURIComponent(preview.id)}?type=Primary&maxWidth=200&tag=${encodeURIComponent(preview.tag)}`,
        alt: '',
        loading: 'lazy'
      }))
    );
    return createElement('label', { className: 'admin-library-row' },
      libraryIcon(lib.collectionType),
      createElement('span', { className: 'admin-library-text' },
        createElement('strong', {}, lib.name),
        createElement('span', {}, countLabel(lib.itemCount))
      ),
      previews,
      checkbox
    );
  };

  function render() {
    list.replaceChildren();
    list.hidden = enableAll;
    bulkRow.hidden = enableAll;
    renderSummary();
    if (enableAll) return;

    if (!libraries || libraries.length === 0) {
      list.appendChild(createElement('p', { className: 'admin-user-dialog-hint' }, 'Keine Bibliotheken gefunden'));
      return;
    }

    for (const group of LIBRARY_GROUPS) {
      const members = libraries.filter(lib => (group.types
        ? group.types.includes(lib.collectionType)
        : !LIBRARY_GROUPS.some(other => other.types?.includes(lib.collectionType))));
      if (!members.length) continue;
      list.appendChild(createElement('div', { className: 'admin-library-group' },
        createElement('span', { className: 'admin-library-group-title' }, group.title),
        ...members.map(row)
      ));
    }
  }

  render();

  return {
    element: createElement('div', { className: 'admin-user-field-group admin-library-field' },
      allRow,
      bulkRow,
      list,
      summary
    ),
    getValue: () => ({
      enableAllFolders: enableAll,
      enabledFolders: enableAll ? [] : Array.from(selected)
    }),
    // What was saved before, for "Rückgängig".
    getOriginal: () => ({ enableAllFolders: Boolean(user.enableAllFolders), enabledFolders: [...originalEnabledFolders] }),
    // With "alle Bibliotheken" on, the ticks underneath do not count: switching
    // it off, ticking around and on again changes nothing.
    hasChanged: () => {
      if (enableAll !== Boolean(user.enableAllFolders)) return true;
      return !enableAll && !setsEqual(selected, originalEnabledFolders);
    }
  };
}

export function buildStreamLimitField(user) {
  const input = createElement('input', {
    className: 'settings-input admin-user-stream-input',
    type: 'number',
    min: '0',
    max: '20',
    step: '1',
    value: String(user.maxConcurrentStreams)
  });

  // −/+ around the number: easier than typing into a number field on a phone.
  const step = delta => {
    const current = parseInt(input.value, 10);
    const next = Math.min(20, Math.max(0, (Number.isInteger(current) ? current : 0) + delta));
    input.value = String(next);
  };
  const stepButton = (delta, label, text) => createElement('button', {
    className: 'admin-user-stepper-button',
    type: 'button',
    'aria-label': label,
    onClick: () => step(delta)
  }, text);

  return {
    element: createElement('div', { className: 'admin-user-field-group admin-user-field-inline' },
      createElement('label', { className: 'admin-user-field-label' }, 'Max. gleichzeitige Streams'),
      createElement('div', { className: 'admin-user-field-row admin-user-stepper' },
        stepButton(-1, 'Ein Stream weniger', '−'),
        input,
        stepButton(1, 'Ein Stream mehr', '+')
      )
    ),
    getValue: () => parseInt(input.value, 10),
    isValid: () => {
      const value = parseInt(input.value, 10);
      return Number.isInteger(value) && value >= 0 && value <= 20;
    },
    hasChanged: () => parseInt(input.value, 10) !== user.maxConcurrentStreams
  };
}

const AGE_OPTIONS = [
  { value: null, label: 'Keine' },
  { value: 0, label: 'FSK 0' },
  { value: 6, label: 'FSK 6' },
  { value: 12, label: 'FSK 12' },
  { value: 16, label: 'FSK 16' },
  { value: 18, label: 'FSK 18' }
];

// Jellyfin's parental control: up to which FSK age the account sees titles,
// and whether films and series without a rating are hidden from it.
export function buildAgeLimitField(user) {
  const original = { maxAge: user.maxAge ?? null, blockUnrated: Boolean(user.blockUnrated) };
  let maxAge = original.maxAge;
  // A limit Jellyfin holds that is no FSK age (set there): shown as is.
  const options = AGE_OPTIONS.some(option => option.value === maxAge)
    ? AGE_OPTIONS
    : [...AGE_OPTIONS, { value: maxAge, label: `Stufe ${maxAge}` }];
  const ages = segmentedRow({
    label: 'Höchste Altersfreigabe',
    description: 'Titel mit höherer Freigabe sieht das Konto nicht, auch nicht in der Suche.',
    options,
    value: maxAge,
    onChange: value => { maxAge = value; }
  });

  const unratedSwitch = createElement('input', {
    type: 'checkbox',
    role: 'switch',
    className: 'settings-switch-input',
    checked: original.blockUnrated,
    'aria-label': 'Titel ohne Altersfreigabe sperren'
  });
  const unratedRow = createElement('label', { className: 'admin-library-all' },
    createElement('span', { className: 'admin-library-all-text' },
      createElement('strong', {}, 'Titel ohne Altersfreigabe sperren'),
      createElement('span', {}, 'Filme und Serien, für die Jellyfin keine Freigabe kennt.')
    ),
    createElement('span', { className: 'settings-switch' }, unratedSwitch, createElement('span', { className: 'settings-switch-track', 'aria-hidden': 'true' }))
  );

  return {
    element: createElement('div', { className: 'admin-user-field-group' }, ages.element, unratedRow),
    getValue: () => ({ maxAge, blockUnrated: unratedSwitch.checked }),
    hasChanged: () => maxAge !== original.maxAge || unratedSwitch.checked !== original.blockUnrated
  };
}
