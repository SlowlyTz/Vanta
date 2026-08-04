import express from 'express';
import { requireAuth, requireFreshAdmin } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppSettingsService } from '../../services/app-settings.service.js';
import { isAllowedWebhookUrl, buildTestEmbed, sendWebhookEmbed } from '../../services/discord-webhook.service.js';

const router = express.Router();

router.use(requireAuth, requireFreshAdmin);

// Maskiert die Webhook-URL für die Ausgabe an den Client: Schema, Host und der Webhook-Id
// bleiben sichtbar ("Pfadanfang"), der Token-Anteil wird bis auf die letzten 4 Zeichen durch
// … ersetzt. Die volle URL verlässt den Server nach dem Speichern nie wieder.
function maskWebhookUrl(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean); // ['api', 'webhooks', '<id>', '<token>']
    const webhooksIndex = segments.indexOf('webhooks');
    const id = segments[webhooksIndex + 1] || '';
    const token = segments[webhooksIndex + 2] || '';
    const maskedToken = token.length > 4 ? `…${token.slice(-4)}` : token;
    return `${parsed.origin}/api/webhooks/${id}/${maskedToken}`;
  } catch {
    return null;
  }
}

function currentStatus() {
  const url = AppSettingsService.get('discord_webhook_url');
  const enabled = AppSettingsService.get('discord_webhook_enabled') === 'true';

  return {
    configured: Boolean(url),
    enabled,
    maskedUrl: maskWebhookUrl(url)
  };
}

router.get('/discord-webhook', asyncHandler(async (req, res) => {
  res.json(currentStatus());
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

  res.json(currentStatus());
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
