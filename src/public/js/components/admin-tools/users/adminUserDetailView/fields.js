import { createElement } from '../../../../utils/dom.js';

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
    placeholder: 'Neues Passwort',
    autocomplete: 'new-password'
  });

  return {
    element: createElement('div', { className: 'admin-user-field-group' },
      createElement('label', { className: 'admin-user-field-label' }, 'Passwort'),
      createElement('div', { className: 'admin-user-field-row' }, input)
    ),
    getValue: () => input.value,
    hasChanged: () => input.value.length > 0,
    clear: () => { input.value = ''; }
  };
}

export function buildLibraryField(user, libraries) {
  let enableAll = Boolean(user.enableAllFolders);
  const originalEnabledFolders = new Set(user.enabledFolders || []);
  const selected = new Set(originalEnabledFolders);

  const libraryGrid = createElement('div', { className: 'admin-user-library-grid' });

  const allBtn = createElement('button', {
    type: 'button',
    className: `admin-user-choice-btn${enableAll ? ' active' : ''}`,
    'aria-pressed': String(enableAll),
    onClick: () => { enableAll = true; renderLibraryAccess(); }
  }, 'Alle Bibliotheken');

  const selectedBtn = createElement('button', {
    type: 'button',
    className: `admin-user-choice-btn${!enableAll ? ' active' : ''}`,
    'aria-pressed': String(!enableAll),
    onClick: () => { enableAll = false; renderLibraryAccess(); }
  }, 'Ausgewählte Bibliotheken');

  const modeGroup = createElement('div', {
    className: 'admin-user-library-mode',
    role: 'group',
    'aria-label': 'Bibliothekszugriff'
  }, allBtn, selectedBtn);

  function renderLibraryAccess() {
    allBtn.className = `admin-user-choice-btn${enableAll ? ' active' : ''}`;
    allBtn.setAttribute('aria-pressed', String(enableAll));
    selectedBtn.className = `admin-user-choice-btn${!enableAll ? ' active' : ''}`;
    selectedBtn.setAttribute('aria-pressed', String(!enableAll));

    libraryGrid.innerHTML = '';
    libraryGrid.classList.toggle('hidden', enableAll);

    if (enableAll) return;

    if (!libraries || libraries.length === 0) {
      libraryGrid.appendChild(createElement('p', { className: 'admin-user-dialog-hint' }, 'Keine Bibliotheken gefunden'));
      return;
    }

    libraries.forEach(lib => {
      const isActive = selected.has(lib.id);
      const libraryButton = createElement('button', {
        type: 'button',
        className: `admin-user-library-toggle${isActive ? ' active' : ''}`,
        'aria-pressed': String(isActive),
        onClick: () => {
          if (selected.has(lib.id)) selected.delete(lib.id);
          else selected.add(lib.id);
          renderLibraryAccess();
        }
      }, lib.name);
      libraryGrid.appendChild(libraryButton);
    });
  }

  renderLibraryAccess();

  return {
    element: createElement('div', { className: 'admin-user-field-group' },
      createElement('label', { className: 'admin-user-field-label' }, 'Bibliothekszugriff'),
      modeGroup,
      libraryGrid
    ),
    getValue: () => ({
      enableAllFolders: enableAll,
      enabledFolders: enableAll ? [] : Array.from(selected)
    }),
    hasChanged: () => enableAll !== Boolean(user.enableAllFolders) || !setsEqual(selected, originalEnabledFolders)
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

  return {
    element: createElement('div', { className: 'admin-user-field-group' },
      createElement('label', { className: 'admin-user-field-label' }, 'Max. gleichzeitige Streams'),
      createElement('div', { className: 'admin-user-field-row' }, input)
    ),
    getValue: () => parseInt(input.value, 10),
    isValid: () => {
      const value = parseInt(input.value, 10);
      return Number.isInteger(value) && value >= 0 && value <= 20;
    },
    hasChanged: () => parseInt(input.value, 10) !== user.maxConcurrentStreams
  };
}
