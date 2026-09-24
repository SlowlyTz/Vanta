import { describe, it, expect, vi, afterEach } from 'vitest';
import { createHelpOverlay, helpSections } from '../../../src/player/src/help.js';
import { KEYBOARD_SHORTCUTS } from '../../../src/player/src/player/shortcuts.js';

function setup({ party = false, canControl = true } = {}) {
  const root = document.createElement('div');
  root.innerHTML = '<div class="vanta-player-shell"></div><button class="gear"></button>';
  document.body.appendChild(root);
  const disposers = [];
  const context = {
    root,
    watchParty: party ? { enabled: true } : null,
    canControlWatchParty: () => canControl,
    ui: { releaseActive: vi.fn() },
    settings: { close: vi.fn() },
    listen: (target, event, handler, options) => {
      target.addEventListener(event, handler, options);
      disposers.push(() => target.removeEventListener(event, handler, options));
    }
  };
  const help = createHelpOverlay(context);
  return { root, context, help, cleanup: () => { help.destroy(); disposers.forEach(dispose => dispose()); root.remove(); } };
}

let env;
afterEach(() => { env?.cleanup(); env = null; });

describe('helpSections', () => {
  it('listet alle Tastenkürzel und zeigt Watch-Party-Hinweise nur in der Party', () => {
    const solo = helpSections();
    expect(solo.map(section => section.id)).toEqual(['keyboard', 'mouse', 'touch']);
    expect(solo[0].rows).toHaveLength(KEYBOARD_SHORTCUTS.length);
    expect(helpSections({ party: true }).at(-1).id).toBe('party');
  });

  it('markiert für Zuschauer, was nur Admins dürfen', () => {
    const rows = helpSections({ party: true, viewer: true })[0].rows;
    expect(rows.find(row => row.label === 'Wiedergabe / Pause').tag).toBe('Nur Admins');
    expect(rows.find(row => row.label === 'Lauter').tag).toBeNull();
  });
});

describe('createHelpOverlay', () => {
  it('öffnet sich über dem Video, schließt das Zahnrad-Menü und blendet die Controls aus', () => {
    env = setup();
    env.context.toggleHelp();
    const overlay = env.root.querySelector('.vanta-help');
    expect(overlay.hidden).toBe(false);
    expect(overlay.getAttribute('role')).toBe('dialog');
    expect(env.context.helpOpen).toBe(true);
    expect(env.root.classList.contains('is-help-open')).toBe(true);
    expect(env.context.settings.close).toHaveBeenCalled();
    expect(document.activeElement).toBe(overlay.querySelector('.vanta-help-close'));
    expect(overlay.querySelectorAll('kbd').length).toBeGreaterThan(10);
  });

  it('schließt mit Esc, ?, dem Schließen-Button und einem Klick daneben', () => {
    env = setup();
    const overlay = env.root.querySelector('.vanta-help');
    const reopen = () => env.context.openHelp();

    reopen();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(env.context.helpOpen).toBe(false);

    reopen();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    expect(overlay.hidden).toBe(true);

    reopen();
    overlay.querySelector('.vanta-help-close').click();
    expect(env.context.helpOpen).toBe(false);

    reopen();
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(env.context.helpOpen).toBe(false);

    reopen();
    overlay.querySelector('.vanta-help-panel').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(env.context.helpOpen).toBe(true);
  });

  it('zeigt Zuschauern die Party-Hinweise und die Admin-Markierung', () => {
    env = setup({ party: true, canControl: false });
    env.context.openHelp();
    const overlay = env.root.querySelector('.vanta-help');
    expect(overlay.querySelector('[data-section="party"]')).not.toBeNull();
    expect(overlay.textContent).toContain('Nur Admins');
  });
});
