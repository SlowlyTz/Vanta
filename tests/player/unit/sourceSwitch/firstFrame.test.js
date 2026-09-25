import { describe, it, expect, vi } from 'vitest';
import { applyPlaybackState } from '../../../../src/player/src/sourceSwitch/loadingStatus.js';

describe('applyPlaybackState · first frame', () => {
  it('counts the video moving on as started when no frame is presented (tab in the background)', async () => {
    const video = new EventTarget();
    Object.assign(video, {
      paused: false,
      currentTime: 12,
      // A hidden tab never calls this back.
      requestVideoFrameCallback: vi.fn(() => 1),
      cancelVideoFrameCallback: vi.fn()
    });
    const player = {
      play: vi.fn(async () => {}),
      querySelector: () => video
    };
    const state = {
      player,
      currentPlayback: { delivery: 'hls' },
      setLoading: vi.fn(),
      setLoadingStatus: vi.fn(),
      setInlineLoading: vi.fn()
    };

    let done = false;
    const started = applyPlaybackState(state, { shouldPlay: true }).then(() => { done = true; });
    await Promise.resolve();
    await Promise.resolve();

    video.dispatchEvent(new Event('timeupdate'));
    await Promise.resolve();
    expect(done).toBe(false);

    video.currentTime = 12.4;
    video.dispatchEvent(new Event('timeupdate'));
    await started;
    expect(done).toBe(true);
    expect(video.cancelVideoFrameCallback).toHaveBeenCalledWith(1);
  });
});
