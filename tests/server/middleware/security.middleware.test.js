import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { permissionsPolicy, PERMISSIONS_POLICY } from '../../../src/server/middleware/security.middleware.js';

describe('permissionsPolicy', () => {
  it('switches off camera, microphone, location and payment, not fullscreen', async () => {
    const app = express();
    app.use(permissionsPolicy);
    app.get('/', (req, res) => res.send('ok'));
    const res = await request(app).get('/');
    expect(res.headers['permissions-policy']).toBe(PERMISSIONS_POLICY);
    expect(PERMISSIONS_POLICY).toContain('camera=()');
    expect(PERMISSIONS_POLICY).not.toContain('fullscreen');
    expect(PERMISSIONS_POLICY).not.toContain('picture-in-picture');
  });
});
