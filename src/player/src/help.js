import { KEYBOARD_SHORTCUTS, POINTER_SHORTCUTS } from './player/shortcuts.js';

// Full-screen help over the running video (about half transparent): every
// key, mouse and touch control, generated from the shortcut table, and how a
// watch party works. Opened with "?" or from the settings flyout.

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export const WATCH_PARTY_HELP = [
  'Admins steuern Wiedergabe, Pause und Spulen für alle. Zuschauer sehen oben „Admin steuert“.',
  'Springt jemand 10 Sekunden, zeigen alle Bildschirme eine Blase mit dem Namen.',
  'Im Zahnrad-Menü siehst du, wer synchron ist, und kannst dich mit „Neu synchronisieren“ zurückholen.',
  'Hängt jemand beim Laden, pausiert die Party, bis alle wieder bereit sind. Der Gastgeber kann das im Zahnrad-Menü abschalten.',
  'Lautstärke, Untertitel, Tonspur und Vollbild stellt jeder für sich ein.'
];

export function helpSections({ party = false, viewer = false } = {}) {
  const tag = entry => (viewer && entry.transport ? 'Nur Admins' : null);
  const sections = [
    {
      id: 'keyboard',
      title: 'Tastatur',
      rows: KEYBOARD_SHORTCUTS.map(entry => ({ keys: entry.keys, label: entry.label, tag: tag(entry) }))
    },
    {
      id: 'mouse',
      title: 'Maus',
      rows: POINTER_SHORTCUTS.filter(entry => entry.pointer === 'mouse').map(entry => ({ input: entry.input, label: entry.label, tag: tag(entry) }))
    },
    {
      id: 'touch',
      title: 'Touch',
      rows: POINTER_SHORTCUTS.filter(entry => entry.pointer === 'touch').map(entry => ({ input: entry.input, label: entry.label, tag: tag(entry) }))
    }
  ];
  if (party) sections.push({ id: 'party', title: 'Watch Party', notes: WATCH_PARTY_HELP });
  return sections;
}

function renderSection(section) {
  const rows = (section.rows || []).map(row => `
    <li class="vanta-help-row${row.tag ? ' is-locked' : ''}">
      <span class="vanta-help-input">${row.keys
        ? row.keys.map(key => `<kbd>${escapeHtml(key)}</kbd>`).join('<span class="vanta-help-or">oder</span>')
        : escapeHtml(row.input)}</span>
      <span class="vanta-help-label">${escapeHtml(row.label)}${row.tag ? `<em>${escapeHtml(row.tag)}</em>` : ''}</span>
    </li>`).join('');
  const notes = (section.notes || []).map(note => `<li class="vanta-help-note">${escapeHtml(note)}</li>`).join('');
  return `
    <section class="vanta-help-section" data-section="${section.id}">
      <h3>${escapeHtml(section.title)}</h3>
      <ul>${rows}${notes}</ul>
    </section>`;
}

export function createHelpOverlay(context) {
  const { root, ui, listen } = context;
  const shell = root.querySelector('.vanta-player-shell');
  let previousFocus = null;

  const overlay = document.createElement('div');
  overlay.className = 'vanta-help';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Hilfe');
  overlay.hidden = true;
  shell.appendChild(overlay);

  const render = () => {
    const party = Boolean(context.watchParty?.enabled);
    const viewer = party && !context.canControlWatchParty();
    overlay.innerHTML = `
      <div class="vanta-help-panel">
        <div class="vanta-help-head">
          <h2>Hilfe</h2>
          <button type="button" class="vanta-help-close" aria-label="Hilfe schließen">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 5.7 17 4.3l-5 5-5-5-1.4 1.4 5 5-5 5L7 17.1l5-5 5 5 1.4-1.4-5-5z"/></svg>
          </button>
        </div>
        <div class="vanta-help-grid">${helpSections({ party, viewer }).map(renderSection).join('')}</div>
        <p class="vanta-help-foot">Mit <kbd>?</kbd> oder <kbd>Esc</kbd> schließen – das Video läuft weiter.</p>
      </div>`;
    overlay.querySelector('.vanta-help-close').addEventListener('click', () => close());
  };

  function open() {
    if (context.helpOpen) return;
    context.settings?.close({ returnFocus: false });
    render();
    previousFocus = document.activeElement;
    context.helpOpen = true;
    overlay.hidden = false;
    root.classList.add('is-help-open');
    ui.releaseActive?.('help');
    void overlay.offsetWidth;
    overlay.classList.add('is-open');
    overlay.querySelector('.vanta-help-close').focus({ preventScroll: true });
  }

  function close() {
    if (!context.helpOpen) return;
    context.helpOpen = false;
    overlay.classList.remove('is-open');
    root.classList.remove('is-help-open');
    overlay.hidden = true;
    if (previousFocus && typeof previousFocus.focus === 'function' && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
  }

  context.toggleHelp = () => (context.helpOpen ? close() : open());
  context.openHelp = open;
  context.closeHelp = close;

  // A click on the dimmed video next to the panel closes it.
  listen(overlay, 'click', event => {
    if (!event.target.closest('.vanta-help-panel')) close();
  });
  listen(overlay, 'pointerup', event => event.stopPropagation());
  listen(document, 'keydown', event => {
    if (!context.helpOpen) return;
    if (event.key === 'Escape' || event.key === '?') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  }, true);

  return {
    open,
    close,
    destroy() {
      close();
      overlay.remove();
    }
  };
}
