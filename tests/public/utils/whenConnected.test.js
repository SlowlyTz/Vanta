import { describe, it, expect, vi } from 'vitest';
import { whenConnected } from '../../../src/public/js/utils/whenConnected.js';

describe('whenConnected', () => {
  it('runs at once for an attached element and later for one attached afterwards', async () => {
    const attached = document.createElement('div');
    document.body.appendChild(attached);
    const now = vi.fn();
    whenConnected(attached, now);
    expect(now).toHaveBeenCalledTimes(1);

    const detached = document.createElement('div');
    const later = vi.fn();
    whenConnected(detached, later);
    expect(later).not.toHaveBeenCalled();
    document.body.appendChild(detached);
    await new Promise(resolve => setTimeout(resolve, 40));
    expect(later).toHaveBeenCalledTimes(1);
    attached.remove();
    detached.remove();
  });

  it('gives up after the frame budget', async () => {
    const never = vi.fn();
    whenConnected(document.createElement('div'), never, { maxFrames: 2 });
    await new Promise(resolve => setTimeout(resolve, 60));
    expect(never).not.toHaveBeenCalled();
  });
});
