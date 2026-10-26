import { describe, it, expect, vi } from 'vitest';
import { createBackHandler, TV_BACK_EVENT } from '../../../src/public/js/tv/back.js';

const handler = (overrides = {}) => createBackHandler({
  topModal: () => null,
  hash: () => '#/search',
  history: { back: vi.fn() },
  confirm: vi.fn(),
  exit: vi.fn(),
  ...overrides
});

describe('TV back', () => {
  it('lets the page take a step of its own first', async () => {
    const history = { back: vi.fn() };
    const onBack = event => event.preventDefault();
    window.addEventListener(TV_BACK_EVENT, onBack);
    expect(await handler({ history })()).toBe('page-step');
    expect(history.back).not.toHaveBeenCalled();
    window.removeEventListener(TV_BACK_EVENT, onBack);

    expect(await handler({ history })()).toBe('history');
    expect(history.back).toHaveBeenCalled();
  });
});
