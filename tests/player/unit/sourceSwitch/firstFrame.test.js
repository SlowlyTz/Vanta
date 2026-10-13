import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
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

// The types vidstack's video and HLS providers accept, read from the
// installed package so an update that narrows them fails here.
const vidstackTypes = () => {
  const source = readFileSync(path.join(process.cwd(), 'node_modules/vidstack/dist/prod/providers/audio/loader.js'), 'utf8');
  const setOf = name => new Set([...source.match(new RegExp(`const ${name} = [^\\[]*\\[([^\\]]*)\\]`))[1].matchAll(/"([^"]+)"/g)].map(match => match[1]));
  return { video: setOf('VIDEO_TYPES'), hls: setOf('HLS_VIDEO_TYPES') };
};

describe('playbackSource', () => {
  it('names a DirectPlay container only when vidstack knows its type', async () => {
    const { playbackSource } = await import('../../../../src/player/src/sourceSwitch.js');
    expect(playbackSource({ url: '/a', delivery: 'hls' }).type).toBe('application/vnd.apple.mpegurl');
    expect(playbackSource({ url: '/a', delivery: 'http', playMethod: 'DirectPlay', container: 'mkv' }).type).toBe('video/mp4');
    expect(playbackSource({ url: '/a', delivery: 'http', playMethod: 'DirectPlay', container: 'mov,mp4,m4a' }).type).toBe('video/mp4');
    expect(playbackSource({ url: '/a', delivery: 'http', playMethod: 'DirectPlay', container: 'webm' }).type).toBe('video/webm');
    expect(playbackSource({ url: '/a', delivery: 'http', container: 'mp4,m4v' }).type).toBe('video/mp4');
    expect(playbackSource({ url: '/a', delivery: 'http' }).type).toBe('video/mp4');
  });

  it('takes the type from the container only for DirectPlay', async () => {
    const { playbackSource } = await import('../../../../src/player/src/sourceSwitch.js');
    expect(playbackSource({ url: '/a', delivery: 'http', playMethod: 'DirectStream', container: 'webm' }).type).toBe('video/mp4');
    expect(playbackSource({ url: '/a', delivery: 'http', playMethod: 'Transcode', container: 'webm' }).type).toBe('video/mp4');
  });

  it('only emits types vidstack loads', async () => {
    const { playbackSource } = await import('../../../../src/player/src/sourceSwitch.js');
    const { video, hls } = vidstackTypes();
    expect(video.has('video/mp4')).toBe(true);
    expect(hls.has('application/vnd.apple.mpegurl')).toBe(true);
    for (const container of ['mkv', 'webm', 'mov', 'mp4', 'm4v', 'avi', 'ts', 'unknown', '']) {
      for (const playMethod of ['DirectPlay', 'DirectStream', 'Transcode']) {
        expect(video.has(playbackSource({ url: '/a', delivery: 'http', playMethod, container }).type)).toBe(true);
      }
    }
    expect(hls.has(playbackSource({ url: '/a', delivery: 'hls', container: 'mkv' }).type)).toBe(true);
  });
});
