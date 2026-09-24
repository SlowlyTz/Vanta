import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSettingsFlyout } from '../../../src/player/src/settings/flyout.js';

function setup() {
  const container = document.createElement('div');
  const button = document.createElement('button');
  button.hidden = true;
  const outside = document.createElement('div');
  document.body.append(container, button, outside);
  const onOpenChange = vi.fn();
  const flyout = createSettingsFlyout({ container, button, onOpenChange });
  const values = { subtitles: 'Aus' };
  flyout.setRows(() => [
    { page: 'subtitles', label: 'Untertitel', value: values.subtitles },
    { page: 'quality', label: 'Qualität', value: 'Auto', hidden: true }
  ]);
  flyout.registerPage('subtitles', {
    title: 'Untertitel',
    render: (body, api) => {
      const option = document.createElement('button');
      option.className = 'vanta-settings-focusable test-option';
      option.textContent = 'Deutsch';
      option.addEventListener('click', () => { values.subtitles = 'Deutsch'; api.back(); });
      body.appendChild(option);
    }
  });
  const element = container.querySelector('.vanta-settings');
  const cleanup = () => {
    flyout.destroy();
    container.remove();
    button.remove();
    outside.remove();
  };
  return { flyout, container, button, outside, element, onOpenChange, cleanup };
}

const press = (target, key) => target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

describe('createSettingsFlyout', () => {
  let env;
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => {
    env?.cleanup();
    vi.useRealTimers();
  });

  it('zeigt das Zahnrad und öffnet sich animiert als Dialog mit den sichtbaren Zeilen', () => {
    env = setup();
    expect(env.button.hidden).toBe(false);
    expect(env.element.hidden).toBe(true);

    env.button.click();
    expect(env.element.hidden).toBe(false);
    expect(env.element.dataset.state).toBe('open');
    expect(env.element.getAttribute('role')).toBe('dialog');
    expect(env.button.getAttribute('aria-expanded')).toBe('true');
    expect(env.onOpenChange).toHaveBeenLastCalledWith(true);

    const rows = env.element.querySelectorAll('.vanta-settings-row');
    expect(rows).toHaveLength(1);
    expect(rows[0].getAttribute('aria-label')).toBe('Untertitel: Aus');
    expect(document.activeElement).toBe(rows[0]);
  });

  it('führt in die Unterseite und mit der Auswahl zurück zur aktualisierten Startseite', () => {
    env = setup();
    env.button.click();
    env.element.querySelector('.vanta-settings-row').click();

    expect(env.flyout.currentPage()).toBe('subtitles');
    expect(env.element.querySelector('.vanta-settings-page-head .vanta-settings-title').textContent).toBe('Untertitel');

    env.element.querySelector('.test-option').click();
    vi.advanceTimersByTime(400);
    expect(env.flyout.currentPage()).toBe('root');
    expect(env.element.querySelector('.vanta-settings-row').getAttribute('aria-label')).toBe('Untertitel: Deutsch');
  });

  it('geht mit Esc eine Seite zurück, schließt auf der Startseite und gibt den Fokus ans Zahnrad', () => {
    env = setup();
    env.button.click();
    env.element.querySelector('.vanta-settings-row').click();

    press(document.activeElement, 'Escape');
    expect(env.flyout.currentPage()).toBe('root');

    press(document.activeElement, 'Escape');
    expect(env.element.dataset.state).toBe('closing');
    expect(env.button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(env.button);
    expect(env.onOpenChange).toHaveBeenLastCalledWith(false);

    vi.advanceTimersByTime(200);
    expect(env.element.hidden).toBe(true);
    expect(env.element.dataset.state).toBe('closed');
  });

  it('schließt bei einem Klick außerhalb, aber nicht bei einem Klick hinein', () => {
    env = setup();
    env.button.click();
    env.element.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(env.flyout.isOpen()).toBe(true);

    env.outside.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(env.flyout.isOpen()).toBe(false);
  });

  it('schaltet über das Zahnrad um und hält Tastendrücke vom Player fern', () => {
    env = setup();
    const documentKeys = vi.fn();
    document.addEventListener('keydown', documentKeys);
    env.button.click();
    press(document.activeElement, ' ');
    expect(documentKeys).not.toHaveBeenCalled();
    document.removeEventListener('keydown', documentKeys);

    env.button.click();
    expect(env.flyout.isOpen()).toBe(false);
  });

  it('schließt auf dem Handy mit einer Wischgeste nach rechts', () => {
    env = setup();
    env.button.click();
    const pointer = (type, x) => env.element.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), { pointerType: 'touch', clientX: x, clientY: 100 }));
    pointer('pointerdown', 100);
    pointer('pointermove', 150);
    expect(env.element.style.getPropertyValue('--swipe')).toBe('50px');
    pointer('pointerup', 200);
    expect(env.flyout.isOpen()).toBe(false);
  });

  it('versteckt das Zahnrad wieder beim Abbau', () => {
    env = setup();
    env.flyout.destroy();
    expect(env.button.hidden).toBe(true);
    expect(env.container.querySelector('.vanta-settings')).toBeNull();
  });
});
