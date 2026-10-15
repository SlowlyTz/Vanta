import { describe, it, expect, vi } from 'vitest';
import { preparePlayerInitialPlayback } from '../../../src/player/src/player/lifecycle.js';

vi.mock('../../../src/player/src/platform.js', () => ({ exitPictureInPicture: vi.fn(), exitInlineFullscreen: vi.fn() }));
vi.mock('../../../src/player/src/orientation.js', () => ({ exitSmartphoneFullscreen: vi.fn() }));

describe('preparePlayerInitialPlayback', () => {
  it('cancels a source that arrives after the player was left', async () => {
    let answer;
    const context = {
      itemId: 'item-1',
      resumePosition: 0,
      destroyed: false,
      setLoading: vi.fn(),
      resolvePlayback: vi.fn(() => new Promise(resolve => { answer = resolve; })),
      reportPlayback: vi.fn().mockResolvedValue(undefined),
      sourceSwitch: { loadPlayback: vi.fn() },
      updateMenus: vi.fn()
    };

    const ready = preparePlayerInitialPlayback(context);
    context.destroyed = true;
    answer({ playSessionId: 'late-session' });
    await ready;

    expect(context.sourceSwitch.loadPlayback).not.toHaveBeenCalled();
    expect(context.reportPlayback).toHaveBeenCalledWith('cancel', {
      itemId: 'item-1',
      playSessionId: 'late-session',
      positionTicks: 0
    }, { keepalive: true });
  });

  it('loads the source as usual while the player stays', async () => {
    const context = {
      itemId: 'item-1',
      resumePosition: 12,
      destroyed: false,
      setLoading: vi.fn(),
      resolvePlayback: vi.fn().mockResolvedValue({ playSessionId: 's1' }),
      reportPlayback: vi.fn(),
      sourceSwitch: { loadPlayback: vi.fn().mockResolvedValue(undefined) },
      updateMenus: vi.fn()
    };

    await preparePlayerInitialPlayback(context);

    expect(context.sourceSwitch.loadPlayback).toHaveBeenCalledWith({ playSessionId: 's1' }, expect.objectContaining({ position: 12 }));
    expect(context.reportPlayback).not.toHaveBeenCalled();
  });
});
