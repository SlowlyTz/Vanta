import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bindSheetSwipe } from '../../../src/public/js/utils/sheetSwipe.js';

function touch(target, type, y, timeStamp) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [{ clientY: y }] });
  Object.defineProperty(event, 'timeStamp', { value: timeStamp });
  target.dispatchEvent(event);
  return event;
}

describe('bindSheetSwipe', () => {
  let sheet;
  let onDismiss;
  let enabled;

  beforeEach(() => {
    vi.useFakeTimers();
    sheet = document.createElement('div');
    Object.defineProperty(sheet, 'offsetHeight', { value: 600 });
    document.body.appendChild(sheet);
    onDismiss = vi.fn();
    enabled = true;
    bindSheetSwipe({ sheet, onDismiss, isEnabled: () => enabled });
  });

  afterEach(() => {
    sheet.remove();
    vi.useRealTimers();
  });

  it('follows the finger down and closes the sheet past the threshold', () => {
    touch(sheet, 'touchstart', 100, 0);
    const move = touch(sheet, 'touchmove', 300, 400);
    expect(move.defaultPrevented).toBe(true);
    expect(sheet.style.transform).toContain('200px');

    touch(sheet, 'touchend', 300, 500);
    vi.advanceTimersByTime(300);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('springs back after a short, slow pull', () => {
    touch(sheet, 'touchstart', 100, 0);
    touch(sheet, 'touchmove', 160, 800);
    touch(sheet, 'touchend', 160, 900);
    vi.advanceTimersByTime(500);

    expect(onDismiss).not.toHaveBeenCalled();
    expect(sheet.style.transform).toBe('');
  });

  it('closes on a quick flick even when it is short', () => {
    touch(sheet, 'touchstart', 100, 0);
    touch(sheet, 'touchmove', 160, 40);
    touch(sheet, 'touchend', 160, 60);
    vi.advanceTimersByTime(300);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('leaves scrolled content, upward swipes and the desktop dialog alone', () => {
    sheet.scrollTop = 40;
    touch(sheet, 'touchstart', 100, 0);
    expect(touch(sheet, 'touchmove', 400, 50).defaultPrevented).toBe(false);
    touch(sheet, 'touchend', 400, 60);

    sheet.scrollTop = 0;
    touch(sheet, 'touchstart', 300, 100);
    expect(touch(sheet, 'touchmove', 100, 150).defaultPrevented).toBe(false);
    touch(sheet, 'touchend', 100, 160);

    enabled = false;
    touch(sheet, 'touchstart', 100, 200);
    expect(touch(sheet, 'touchmove', 400, 250).defaultPrevented).toBe(false);
    touch(sheet, 'touchend', 400, 260);

    vi.advanceTimersByTime(500);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
