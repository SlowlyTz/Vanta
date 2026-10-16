import { describe, it, expect, vi } from 'vitest';
import { normalizeKey, registerTizenKeys } from '../../../src/public/js/tv/keys.js';
import { createBackHandler } from '../../../src/public/js/tv/back.js';

const key = (props) => ({ key: '', keyCode: 0, target: document.body, ...props });

describe('normalizeKey', () => {
  it('maps arrows, OK and the media keys by name or code', () => {
    expect(normalizeKey(key({ key: 'ArrowUp' }))).toBe('up');
    expect(normalizeKey(key({ key: 'Unidentified', keyCode: 39 }))).toBe('right');
    expect(normalizeKey(key({ key: 'Enter' }))).toBe('ok');
    expect(normalizeKey(key({ key: 'MediaPlayPause' }))).toBe('playpause');
    expect(normalizeKey(key({ keyCode: 415 }))).toBe('play');
    expect(normalizeKey(key({ keyCode: 417 }))).toBe('ff');
    expect(normalizeKey(key({ key: 'a' }))).toBeNull();
  });

  it('knows the Back keys of webOS, Tizen and Android TV', () => {
    expect(normalizeKey(key({ keyCode: 461 }))).toBe('back');
    expect(normalizeKey(key({ keyCode: 10009 }))).toBe('back');
    expect(normalizeKey(key({ key: 'GoBack' }))).toBe('back');
    expect(normalizeKey(key({ key: 'Escape' }))).toBe('back');
    expect(normalizeKey(key({ key: 'Backspace' }))).toBe('back');
    const input = document.createElement('input');
    expect(normalizeKey(key({ key: 'Backspace', target: input }))).toBeNull();
  });

  it('asks Tizen for the media keys when it is there', () => {
    const tizen = { tvinputdevice: { registerKeyBatch: vi.fn() } };
    expect(registerTizenKeys(tizen)).toBe(true);
    expect(tizen.tvinputdevice.registerKeyBatch).toHaveBeenCalledWith(expect.arrayContaining(['MediaPlayPause']));
    expect(registerTizenKeys(undefined)).toBe(false);
  });
});

describe('createBackHandler', () => {
  const setup = ({ modal = null, sidebarOpen = false, hash = '#/item/1', answer = false } = {}) => {
    const history = { back: vi.fn() };
    const sidebar = { isOpen: () => sidebarOpen, close: vi.fn() };
    const confirm = vi.fn(async () => answer);
    const exit = vi.fn();
    const back = createBackHandler({ topModal: () => modal, sidebar, hash: () => hash, history, confirm, exit });
    return { back, history, sidebar, confirm, exit };
  };

  it('closes a dialog first, then the sidebar', async () => {
    const modal = { close: vi.fn() };
    expect(await setup({ modal, sidebarOpen: true }).back()).toBe('modal');
    expect(modal.close).toHaveBeenCalled();
    const s = setup({ sidebarOpen: true });
    expect(await s.back()).toBe('sidebar');
    expect(s.sidebar.close).toHaveBeenCalled();
  });

  it('leaves the player and other pages through the history', async () => {
    const player = setup({ hash: '#/player/1' });
    expect(await player.back()).toBe('player');
    expect(player.history.back).toHaveBeenCalled();
    expect(await setup().back()).toBe('history');
  });

  it('asks before leaving VANTA from the home page', async () => {
    const stay = setup({ hash: '#/home', answer: false });
    expect(await stay.back()).toBe('stay');
    expect(stay.exit).not.toHaveBeenCalled();
    const leave = setup({ hash: '#/home', answer: true });
    expect(await leave.back()).toBe('exit');
    expect(leave.exit).toHaveBeenCalled();
  });
});

describe('bindBackKey', () => {
  const press = (target, { prevent = false, key = 'GoBack' } = {}) => {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    if (prevent) target.addEventListener('keydown', e => e.preventDefault(), { once: true });
    target.dispatchEvent(event);
  };

  it('goes back, but not when a dialog already took the key', async () => {
    const { bindBackKey } = await import('../../../src/public/js/tv/back.js');
    const back = vi.fn();
    const unbind = bindBackKey(back);
    const button = document.body.appendChild(document.createElement('button'));

    press(button);
    expect(back).toHaveBeenCalledTimes(1);
    press(button, { prevent: true });
    expect(back).toHaveBeenCalledTimes(1);

    unbind();
    button.remove();
  });

  it('inside the player a prevented Back still leaves (vidstack prevents every key)', async () => {
    const { bindBackKey } = await import('../../../src/public/js/tv/back.js');
    const back = vi.fn();
    const unbind = bindBackKey(back);
    const player = document.body.appendChild(document.createElement('media-player'));
    const control = player.appendChild(document.createElement('button'));

    press(control, { prevent: true });
    press(control, { prevent: true, key: 'Backspace' });
    expect(back).toHaveBeenCalledTimes(2);

    // A player overlay that handles Back stops it before it gets here.
    control.addEventListener('keydown', e => { e.preventDefault(); e.stopPropagation(); }, { once: true });
    press(control);
    expect(back).toHaveBeenCalledTimes(2);

    unbind();
    player.remove();
  });
});
