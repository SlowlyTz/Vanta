import { describe, it, expect, vi } from 'vitest';
import {
  createPageScope, runInPageScope, getCurrentPageScope, resolvePageScope, setActivePageScope, PAGE_LEFT
} from '../../../src/public/js/utils/pageScope.js';

describe('page scope', () => {
  it('runs cleanups once, newest first, and aborts its signal with PAGE_LEFT', () => {
    const scope = createPageScope();
    const order = [];
    scope.onLeave(() => order.push('first'));
    scope.onLeave(() => order.push('second'));

    scope.leave();
    scope.leave();

    expect(order).toEqual(['second', 'first']);
    expect(scope.signal.aborted).toBe(true);
    expect(scope.signal.reason).toBe(PAGE_LEFT);
  });

  it('runs a cleanup registered after leaving at once, and keeps going past a failing one', () => {
    const scope = createPageScope();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const after = vi.fn();
    scope.onLeave(() => { throw new Error('boom'); });
    scope.onLeave(after);
    scope.leave();
    expect(after).toHaveBeenCalled();

    const late = vi.fn();
    scope.onLeave(late);
    expect(late).toHaveBeenCalled();
    error.mockRestore();
  });

  it('removes listeners it added', () => {
    const scope = createPageScope();
    const handler = vi.fn();
    scope.listen(window, 'resize', handler);
    window.dispatchEvent(new Event('resize'));
    scope.leave();
    window.dispatchEvent(new Event('resize'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('is found by components built inside the page, and afterwards through the page on screen', () => {
    const building = createPageScope();
    expect(runInPageScope(building, () => getCurrentPageScope())).toBe(building);

    const shown = createPageScope();
    setActivePageScope(shown);
    expect(getCurrentPageScope()).toBe(shown);
    expect(resolvePageScope()).toBe(shown);

    shown.leave();
    expect(getCurrentPageScope()).toBeNull();
    const fallback = resolvePageScope();
    expect(fallback.isLeft).toBe(false);
    setActivePageScope(null);
  });
});
