import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { jellyfinRoute, NOT_FOUND_MESSAGE } from '../../../src/server/utils/jellyfinRoute.js';

const failing = (status) => async () => {
  const error = new Error(`upstream ${status}`);
  error.status = status;
  throw error;
};

const run = async (handler, params = {}) => {
  const res = {
    headersSent: false,
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  const req = { params, session: null };
  const next = vi.fn();
  jellyfinRoute('Test', 'Failed', handler)(req, res, next);
  await new Promise(resolve => setTimeout(resolve, 0));
  return { res, next };
};

describe('jellyfinRoute', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('answers an item Jellyfin does not know with 404', async () => {
    const { res } = await run(failing(404), { id: 'abc' });
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: NOT_FOUND_MESSAGE });
  });

  it('treats a malformed item id (400) as not found', async () => {
    const { res } = await run(failing(400), { id: 'not-an-id' });
    expect(res.statusCode).toBe(404);
  });

  it('keeps a 400 without an item id a server error', async () => {
    const { res } = await run(failing(400));
    expect(res.statusCode).toBe(500);
  });

  it('passes a Jellyfin timeout on as 504', async () => {
    const { res } = await run(failing(504), { id: 'abc' });
    expect(res.statusCode).toBe(504);
    expect(res.body).toEqual({ error: 'Failed' });
  });

  it('answers anything else with 500 and the failure message', async () => {
    const { res } = await run(failing(502), { id: 'abc' });
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Failed' });
  });

  it('ends the session when Jellyfin rejects the token', async () => {
    const { res } = await run(failing(401));
    expect(res.statusCode).toBe(401);
  });
});
