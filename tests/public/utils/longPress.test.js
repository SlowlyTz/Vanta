import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bindContextAction } from '../../../src/public/js/utils/longPress.js';

const pointer = (type, x = 10, y = 10, pointerType = 'touch') => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { clientX: x, clientY: y, pointerType });
  return event;
};

describe('bindContextAction', () => {
  let card;
  let onOpen;
  let unbind;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<a class="card" href="#/item/1" data-item-id="1"><img></a><p class="other">x</p>';
    card = document.querySelector('.card');
    onOpen = vi.fn();
    unbind = bindContextAction(document, '.card', onOpen);
  });

  afterEach(() => {
    unbind();
    vi.useRealTimers();
  });

  it('opens after a 500 ms press and swallows the click that follows', () => {
    card.querySelector('img').dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(499);
    expect(onOpen).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onOpen).toHaveBeenCalledWith(card, { x: 10, y: 10, source: 'touch' });

    card.dispatchEvent(pointer('pointerup'));
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    card.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);

    const later = new MouseEvent('click', { bubbles: true, cancelable: true });
    card.dispatchEvent(later);
    expect(later.defaultPrevented).toBe(false);
  });

  it('is cancelled by moving the finger (scrolling) or lifting it early', () => {
    card.dispatchEvent(pointer('pointerdown'));
    card.dispatchEvent(pointer('pointermove', 10, 25));
    vi.advanceTimersByTime(600);
    card.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(300);
    card.dispatchEvent(pointer('pointerup'));
    vi.advanceTimersByTime(600);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('opens on a right click at the pointer and blocks the browser menu', () => {
    const event = pointer('contextmenu', 40, 50, 'mouse');
    card.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(onOpen).toHaveBeenCalledWith(card, { x: 40, y: 50, source: 'mouse' });
  });

  it('does not open twice when Android follows the press with contextmenu', () => {
    card.dispatchEvent(pointer('pointerdown'));
    vi.advanceTimersByTime(500);
    card.dispatchEvent(pointer('contextmenu'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('opens with the menu key or Shift+F10 on a focused card', () => {
    card.focus();
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'ContextMenu', bubbles: true }));
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'F10', shiftKey: true, bubbles: true }));
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(onOpen.mock.calls[0][1].source).toBe('keyboard');
  });

  it('ignores anything that is not a card', () => {
    document.querySelector('.other').dispatchEvent(pointer('contextmenu', 0, 0, 'mouse'));
    expect(onOpen).not.toHaveBeenCalled();
  });
});
