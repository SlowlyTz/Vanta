import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/player/src/platform.js', async importOriginal => ({
  ...(await importOriginal()),
  isFullscreen: vi.fn(() => false),
  enterFullscreen: vi.fn(async () => {}),
  exitFullscreen: vi.fn(async () => {})
}));

vi.mock('../../../src/player/src/orientation.js', () => ({
  lockLandscape: vi.fn(async () => true),
  unlockOrientation: vi.fn(async () => true)
}));

import { enterFullscreen, exitFullscreen, isFullscreen } from '../../../src/player/src/platform.js';
import { lockLandscape, unlockOrientation } from '../../../src/player/src/orientation.js';
import { bindFullscreenControls } from '../../../src/player/src/player/fullscreenControls.js';

function setup(extra = {}) {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="vanta-player-shell">
      <button class="vanta-player-fullscreen-button"></button>
    </div>`;
  document.body.appendChild(root);
  const disposers = [];
  const context = {
    root,
    iosLike: false,
    disposers,
    listen: (target, event, handler) => {
      target.addEventListener(event, handler);
      disposers.push(() => target.removeEventListener(event, handler));
    },
    ...extra
  };
  bindFullscreenControls(context);
  return { root, context, shell: root.querySelector('.vanta-player-shell') };
}

describe('bindFullscreenControls', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => { document.body.innerHTML = ''; });

  it('puts the player shell into fullscreen by default', async () => {
    const { context, shell } = setup();
    await context.toggleFullscreen();
    expect(enterFullscreen).toHaveBeenCalledWith(shell);
  });

  it('puts the element the page hands in into fullscreen, so its overlays stay visible', async () => {
    const page = document.createElement('div');
    const { root } = setup({ fullscreenTarget: () => page });
    root.querySelector('.vanta-player-fullscreen-button').click();
    await vi.waitFor(() => expect(enterFullscreen).toHaveBeenCalledWith(page));
  });

  it('turns the video sideways on a phone and frees the rotation again', async () => {
    const { context } = setup({ isPhone: true });
    await context.toggleFullscreen();
    expect(lockLandscape).toHaveBeenCalled();

    isFullscreen.mockReturnValue(true);
    await context.toggleFullscreen();
    expect(unlockOrientation).toHaveBeenCalled();
    expect(exitFullscreen).toHaveBeenCalled();
    isFullscreen.mockReturnValue(false);
  });

  it('frees the rotation when the system ends fullscreen (back gesture)', () => {
    setup({ isPhone: true });
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(unlockOrientation).toHaveBeenCalled();
  });

  it('leaves the rotation alone on desktop', async () => {
    const { context } = setup({ isPhone: false });
    await context.toggleFullscreen();
    expect(lockLandscape).not.toHaveBeenCalled();
  });
});
