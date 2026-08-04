import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import settingsRoutes from '../../../../src/server/routes/admin/settings.routes.js';

vi.mock('../../../../src/server/services/jellyfin/auth.service.js', () => ({
  AuthService: { isUserAdmin: vi.fn() }
}));

vi.mock('../../../../src/server/services/app-settings.service.js', () => ({
  AppSettingsService: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  }
}));

vi.mock('../../../../src/server/services/discord-webhook.service.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    sendWebhookEmbed: vi.fn(),
    buildTestEmbed: vi.fn(() => ({ title: 'Testnachricht von Vanta' }))
  };
});

import { AuthService } from '../../../../src/server/services/jellyfin/auth.service.js';
import { AppSettingsService } from '../../../../src/server/services/app-settings.service.js';
import { sendWebhookEmbed } from '../../../../src/server/services/discord-webhook.service.js';

const VALID_URL = 'https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyzf9c2';

function createApp({ authenticated = true } = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.session = authenticated
      ? { userId: 'admin-1', accessToken: 'admin-token', username: 'admin' }
      : {};
    next();
  });
  app.use('/', settingsRoutes);
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

// Simple in-memory backing store so AppSettingsService.get/set/remove behave like the
// real key/value wrapper without touching the actual DB.
function backAppSettingsServiceWithStore() {
  const store = new Map();
  AppSettingsService.get.mockImplementation((key) => (store.has(key) ? store.get(key) : null));
  AppSettingsService.set.mockImplementation((key, value) => store.set(key, value));
  AppSettingsService.remove.mockImplementation((key) => store.delete(key));
  return store;
}

describe('Admin Settings Routes (Discord webhook)', () => {
  let store;

  beforeEach(() => {
    vi.clearAllMocks();
    AuthService.isUserAdmin.mockResolvedValue(true);
    store = backAppSettingsServiceWithStore();
  });

  describe('auth protection', () => {
    it('rejects requests without a session', async () => {
      const res = await request(createApp({ authenticated: false })).get('/discord-webhook');
      expect(res.status).toBe(401);
    });

    it('rejects non-admin users', async () => {
      AuthService.isUserAdmin.mockResolvedValue(false);
      const res = await request(createApp()).get('/discord-webhook');
      expect(res.status).toBe(403);
    });
  });

  describe('GET /discord-webhook', () => {
    it('reports not configured when nothing is stored', async () => {
      const res = await request(createApp()).get('/discord-webhook');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ configured: false, enabled: false, maskedUrl: null });
    });

    it('never returns the full URL, only a masked version', async () => {
      store.set('discord_webhook_url', VALID_URL);
      store.set('discord_webhook_enabled', 'true');

      const res = await request(createApp()).get('/discord-webhook');

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(true);
      expect(res.body.enabled).toBe(true);
      expect(res.body.maskedUrl).not.toContain('abcdefghijklmnopqrstuvwxyz');
      expect(res.body.maskedUrl.startsWith('https://discord.com/api/webhooks/')).toBe(true);
      expect(res.body.maskedUrl.endsWith('f9c2')).toBe(true);
    });
  });

  describe('PUT /discord-webhook', () => {
    it('rejects a non-Discord URL', async () => {
      const res = await request(createApp()).put('/discord-webhook').send({ url: 'https://evil.example.com/hook' });

      expect(res.status).toBe(400);
      expect(AppSettingsService.set).not.toHaveBeenCalled();
    });

    it('rejects an empty URL', async () => {
      const res = await request(createApp()).put('/discord-webhook').send({ url: '   ' });
      expect(res.status).toBe(400);
    });

    it('stores a valid Discord URL', async () => {
      const res = await request(createApp()).put('/discord-webhook').send({ url: VALID_URL });

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(true);
      expect(AppSettingsService.set).toHaveBeenCalledWith('discord_webhook_url', VALID_URL);
    });

    it('changes only the switch when url is omitted, leaving a stored URL untouched', async () => {
      store.set('discord_webhook_url', VALID_URL);

      const res = await request(createApp()).put('/discord-webhook').send({ enabled: true });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ configured: true, enabled: true, maskedUrl: expect.any(String) });
      expect(store.get('discord_webhook_url')).toBe(VALID_URL);
    });

    it('rejects a non-boolean enabled value', async () => {
      const res = await request(createApp()).put('/discord-webhook').send({ enabled: 'yes' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /discord-webhook', () => {
    it('clears both the URL and the switch', async () => {
      store.set('discord_webhook_url', VALID_URL);
      store.set('discord_webhook_enabled', 'true');

      const res = await request(createApp()).delete('/discord-webhook');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ configured: false, enabled: false, maskedUrl: null });
      expect(store.has('discord_webhook_url')).toBe(false);
      expect(store.has('discord_webhook_enabled')).toBe(false);
    });
  });

  describe('POST /discord-webhook/test', () => {
    it('fails with 400 when no URL is stored and none is given', async () => {
      const res = await request(createApp()).post('/discord-webhook/test').send({});

      expect(res.status).toBe(400);
      expect(sendWebhookEmbed).not.toHaveBeenCalled();
    });

    it('rejects a non-Discord test URL', async () => {
      const res = await request(createApp()).post('/discord-webhook/test').send({ url: 'https://evil.example.com/x' });
      expect(res.status).toBe(400);
    });

    it('tests the stored URL when none is given in the body', async () => {
      store.set('discord_webhook_url', VALID_URL);
      sendWebhookEmbed.mockResolvedValue({ ok: true, status: 204 });

      const res = await request(createApp()).post('/discord-webhook/test').send({});

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, status: 204 });
      expect(sendWebhookEmbed).toHaveBeenCalledWith(VALID_URL, { title: 'Testnachricht von Vanta' });
    });

    it('tests a URL given in the body without persisting it', async () => {
      sendWebhookEmbed.mockResolvedValue({ ok: true, status: 204 });

      const res = await request(createApp()).post('/discord-webhook/test').send({ url: VALID_URL });

      expect(res.status).toBe(200);
      expect(AppSettingsService.set).not.toHaveBeenCalled();
    });

    it('reports a Discord failure through to the caller', async () => {
      store.set('discord_webhook_url', VALID_URL);
      sendWebhookEmbed.mockResolvedValue({ ok: false, status: 404 });

      const res = await request(createApp()).post('/discord-webhook/test').send({});

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: false, status: 404 });
    });
  });
});
