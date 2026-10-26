import { describe, it, expect, vi } from 'vitest';
import { Store } from '../../../src/public/js/store/store.js';

class Counter extends Store {
  constructor(options) { super(options); this.count = 0; }
  getState() { return { count: this.count }; }
  increment() { this.count++; this.notify(); }
}

describe('Store', () => {
  it('hands new listeners the state at once unless told otherwise', () => {
    const eager = vi.fn();
    new Counter().subscribe(eager);
    expect(eager).toHaveBeenCalledWith({ count: 0 });

    const lazy = vi.fn();
    new Counter({ emitOnSubscribe: false }).subscribe(lazy);
    expect(lazy).not.toHaveBeenCalled();
  });

  it('notifies until unsubscribed, also when a listener unsubscribes itself', () => {
    const store = new Counter({ emitOnSubscribe: false });
    const calls = [];
    const unsubscribeA = store.subscribe(state => { calls.push(['a', state.count]); unsubscribeA(); });
    store.subscribe(state => calls.push(['b', state.count]));

    store.increment();
    store.increment();
    expect(calls).toEqual([['a', 1], ['b', 1], ['b', 2]]);
  });

  it('keeps notifying the others when a listener throws', () => {
    const store = new Counter({ emitOnSubscribe: false });
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const after = vi.fn();
    store.subscribe(() => { throw new Error('broken'); });
    store.subscribe(after);

    store.increment();
    expect(after).toHaveBeenCalledWith({ count: 1 });
    error.mockRestore();
  });
});
