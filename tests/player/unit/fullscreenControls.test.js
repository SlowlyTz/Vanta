import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/player/src/platform.js', async importOriginal => ({
  ...(await importOriginal()),
  isFullscreen: vi.fn(() => false),
  enterFullscreen: vi.fn(async () => {}),
  exitFullscreen: vi.fn(async () => {})
}));

import { enterFullscreen } from '../../../src/player/src/platform.js';
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
});
