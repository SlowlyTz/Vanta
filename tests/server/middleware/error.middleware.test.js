import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../../../src/server/middleware/error.middleware.js';

function createApp() {
  const app = express();
  app.use(express.json({ limit: '10b' }));
  app.post('/echo', (req, res) => res.json(req.body));
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('answers a broken JSON body in German, not with the parser text', async () => {
    const res = await request(createApp()).post('/echo').set('Content-Type', 'application/json').send('{"a":');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Ungültige Anfrage' });
  });

  it('answers a body over the limit in German', async () => {
    const res = await request(createApp()).post('/echo').send({ text: 'much too long for the limit' });
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: 'Anfrage zu groß' });
  });
});
