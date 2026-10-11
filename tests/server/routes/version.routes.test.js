import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import versionRoutes from '../../../src/server/routes/version.routes.js';
import { APP_VERSION } from '../../../src/public/js/shared/version.js';

describe('GET /api/version', () => {
  it('names the running release next to the build, uncached', async () => {
    const app = express();
    app.use('/api/version', versionRoutes);
    const response = await request(app).get('/api/version');
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.version).toBe(APP_VERSION);
    expect(response.body).toHaveProperty('build');
  });
});
