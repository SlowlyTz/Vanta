import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import playbackRoutes from './playback.routes.js';

vi.mock('../../services/jellyfin/playback-api.service.js', () => ({
  PlaybackApiService: {
    getPlaybackInfo: vi.fn(),
    reportPlayback: vi.fn(),
    markPlayed: vi.fn(),
    fetchPlaybackResource: vi.fn()
  }
}));

vi.mock('../../services/playback.service.js', () => ({
  PlaybackService: {
    resolvePlayback: vi.fn(),
    normalizeJellyfinPath: vi.fn(),
    isPlaylistResponse: vi.fn(),
    rewritePlaylist: vi.fn()
  }
}));

vi.mock('../../services/stream-session.service.js', () => ({
  streamSessionService: {
    reserve: vi.fn(),
    markStarted: vi.fn(),
    touch: vi.fn(),
    release: vi.fn()
  }
}));

import { PlaybackApiService } from '../../services/jellyfin/playback-api.service.js';
import { PlaybackService } from '../../services/playback.service.js';
import { streamSessionService } from '../../services/stream-session.service.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = {
      userId: 'user-1',
      accessToken: 'token',
      username: 'alice',
      destroy: vi.fn((cb) => cb(null))
    };
    next();
  });
  app.use('/', playbackRoutes);
  return app;
}

describe('Playback Routes stream-limit integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PlaybackApiService.getPlaybackInfo.mockResolvedValue({ MediaSources: [{}], PlaySessionId: 'jf-session-1' });
    PlaybackService.resolvePlayback.mockReturnValue({ playSessionId: 'jf-session-1', url: '/proxy-url' });
  });

  describe('GET /:id', () => {
    it('reserves a stream session using the resolved playSessionId before responding', async () => {
      const res = await request(createApp()).get('/item-1');

      expect(res.status).toBe(200);
      expect(streamSessionService.reserve).toHaveBeenCalledWith({
        userId: 'user-1',
        username: 'alice',
        itemId: 'item-1',
        playSessionId: 'jf-session-1'
      });
    });

    it('returns 429 with limit details when the stream limit is reached', async () => {
      const limitError = new Error('Stream-Limit erreicht. Maximal erlaubt: 1');
      limitError.status = 429;
      limitError.code = 'STREAM_LIMIT_REACHED';
      limitError.limit = 1;
      limitError.activeStreams = 1;
      streamSessionService.reserve.mockImplementation(() => { throw limitError; });

      const res = await request(createApp()).get('/item-1');

      expect(res.status).toBe(429);
      expect(res.body).toEqual({
        error: 'Stream-Limit erreicht. Maximal erlaubt: 1',
        code: 'STREAM_LIMIT_REACHED',
        limit: 1,
        activeStreams: 1
      });
    });

    it('propagates a non-limit error from reserve as a generic failure instead of masking it', async () => {
      const unexpected = new Error('tracking failure');
      unexpected.status = 500;
      streamSessionService.reserve.mockImplementation(() => { throw unexpected; });

      const res = await request(createApp()).get('/item-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to resolve playback media source');
    });
  });

  describe('POST /report/:event', () => {
    function baseBody(overrides = {}) {
      return {
        itemId: 'item-1',
        playSessionId: 'jf-session-1',
        positionTicks: 1000,
        ...overrides
      };
    }

    it('marks the session started on a start report', async () => {
      const res = await request(createApp()).post('/report/start').send(baseBody());

      expect(res.status).toBe(204);
      expect(streamSessionService.markStarted).toHaveBeenCalledWith('user-1', 'jf-session-1');
    });

    it('touches the session on a progress report', async () => {
      await request(createApp()).post('/report/progress').send(baseBody());
      expect(streamSessionService.touch).toHaveBeenCalledWith('user-1', 'jf-session-1');
    });

    it('releases the session on a stopped report', async () => {
      await request(createApp()).post('/report/stopped').send(baseBody());
      expect(streamSessionService.release).toHaveBeenCalledWith('user-1', 'jf-session-1');
    });

    it('releases the session on an ended report', async () => {
      await request(createApp()).post('/report/ended').send(baseBody());
      expect(streamSessionService.release).toHaveBeenCalledWith('user-1', 'jf-session-1');
      expect(PlaybackApiService.markPlayed).toHaveBeenCalledWith('user-1', 'token', 'item-1');
    });
  });
});
