// Admin settings: the Discord webhook that announces new requests and reports.
import express from 'express';
import { requireAuth, requireFreshAdmin } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppSettingsService } from '../../services/app-settings.service.js';
import { isAllowedWebhookUrl, buildTestEmbed, sendWebhookEmbed, webhookStatus } from '../../services/discord-webhook.service.js';

const router = express.Router();

router.use(requireAuth, requireFreshAdmin);

router.get('/discord-webhook', asyncHandler(async (req, res) => {
  res.json(webhookStatus());
}));

router.put('/discord-webhook', asyncHandler(async (req, res) => {
  const { url, enabled } = req.body || {};

  if (url !== undefined) {
    if (typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'Webhook-URL darf nicht leer sein' });
    }

    if (!isAllowedWebhookUrl(url.trim())) {
      return res.status(400).json({ error: 'Nur Discord-Webhook-URLs (discord.com oder discordapp.com) sind erlaubt' });
    }

    AppSettingsService.set('discord_webhook_url', url.trim());
  }

  if (enabled !== undefined) {
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled muss ein Boolean sein' });
    }

    AppSettingsService.set('discord_webhook_enabled', enabled ? 'true' : 'false');
  }

  res.json(webhookStatus());
}));

router.delete('/discord-webhook', asyncHandler(async (req, res) => {
  AppSettingsService.remove('discord_webhook_url');
  AppSettingsService.remove('discord_webhook_enabled');
  res.json({ configured: false, enabled: false, maskedUrl: null });
}));

router.post('/discord-webhook/test', asyncHandler(async (req, res) => {
  const url = (req.body?.url || AppSettingsService.get('discord_webhook_url') || '').trim();

  if (!url) {
    return res.status(400).json({ error: 'Keine Webhook-URL hinterlegt' });
  }

  if (!isAllowedWebhookUrl(url)) {
    return res.status(400).json({ error: 'Nur Discord-Webhook-URLs (discord.com oder discordapp.com) sind erlaubt' });
  }

  const result = await sendWebhookEmbed(url, buildTestEmbed());
  res.json({ ok: result.ok, status: result.status, error: result.error });
}));

export default router;
