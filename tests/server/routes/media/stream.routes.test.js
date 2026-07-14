import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import streamRoutes from '../../../../src/server/routes/media/stream.routes.js';

vi.mock('../../../../src/server/services/jellyfin/playback-api.service.js', () => ({
  PlaybackApiService: { fetchVideoStream: vi.fn() }
}));

vi.mock('../../../../src/server/services/stream-session.service.js', () => ({
  streamSessionService: {
    reserve: vi.fn(),
    markStarted: vi.fn(),
    touch: vi.fn(),
    release: vi.fn()
  }
}));

vi.mock('../../../../src/server/routes/media/proxyHelpers.js', () => ({
  forwardHeaders: vi.fn(),
  pipeReadable: vi.fn().mockImplementation((response, req, res) => {
    res.end();
    return Promise.resolve();
  }),
  ensureContentType: vi.fn(),
  FORWARD_HEADERS: { stream: [] }
}));

import { PlaybackApiService } from '../../../../src/server/services/jellyfin/playback-api.service.js';
import { streamSessionService } from '../../../../src/server/services/stream-session.service.js';

function createApp() {
  const app = express();
  app.use((req, res, next) => {
    req.session = { userId: 'user-1', accessToken: 'token', username: 'alice' };
    next();
  });
  app.use('/', streamRoutes);
  return app;
}

describe('Legacy Stream Route stream-limit integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PlaybackApiService.fetchVideoStream.mockResolvedValue({
      status: 200,
      headers: { get: () => null },
      body: null
    });
  });

  it('reserves a synthetic session for the user/item before proxying and marks it started', async () => {
    await request(createApp()).get('/item-1');

    expect(streamSessionService.reserve).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      username: 'alice',
      itemId: 'item-1',
      playSessionId: expect.stringContaining('legacy:item-1:user-1:')
    }));
    expect(streamSessionService.markStarted).toHaveBeenCalledWith('user-1', expect.stringContaining('legacy:item-1:user-1:'));
  });

  it('returns 429 with limit details instead of proxying when the stream limit is reached', async () => {
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
    expect(PlaybackApiService.fetchVideoStream).not.toHaveBeenCalled();
  });
});
