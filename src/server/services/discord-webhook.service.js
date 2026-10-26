// Discord webhook for new requests and problem reports (admin setting).
import { AppSettingsService } from './app-settings.service.js';
import { formatScopeLabel } from './request-scope.js';
import { getProblemLabel, getReportScopeLabel } from '../../public/js/shared/reports.js';

const DISCORD_LIMITS = { title: 256, description: 4096, fieldValue: 1024 };
const DESCRIPTION_PREVIEW_LENGTH = 300;
const WEBHOOK_TIMEOUT_MS = 5000;
const EMBED_COLOR = 0x5865f2; // Discord blurple
const REPORT_COLOR = 0xef4444; // reports stand out in red
const TMDB_TYPE_LABEL = { movie: 'Film', tv: 'Serie' };

// Only Discord webhooks: the admin setting must not turn VANTA into a client
// for arbitrary (internal) addresses such as the Jellyfin server.
export function isAllowedWebhookUrl(url) {
  if (typeof url !== 'string') return false;

  try {
    const parsed = new URL(url);
    const allowedHosts = ['discord.com', 'discordapp.com'];
    return parsed.protocol === 'https:'
      && allowedHosts.includes(parsed.hostname)
      && parsed.pathname.startsWith('/api/webhooks/');
  } catch {
    return false;
  }
}

const truncate = (text, max) => {
  const str = String(text ?? '');
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
};

const getReleaseYear = (media) => {
  const date = media?.release_date || media?.first_air_date;
  return date ? String(date).slice(0, 4) : null;
};

// The embed for a new request. `media` are the TMDB details (year and
// overview are not in the requests table).
export function buildRequestEmbed(request, media = null) {
  const year = getReleaseYear(media);

  const embed = {
    title: truncate(request.title, DISCORD_LIMITS.title),
    url: `https://www.themoviedb.org/${request.tmdb_type}/${request.tmdb_id}`,
    color: EMBED_COLOR,
    timestamp: new Date(request.created_at).toISOString(),
    fields: [
      { name: 'Angefragt von', value: truncate(request.username || 'Unbekannt', DISCORD_LIMITS.fieldValue), inline: true },
      { name: 'Typ', value: TMDB_TYPE_LABEL[request.tmdb_type] || request.tmdb_type, inline: true },
      { name: 'Jahr', value: year || 'Unbekannt', inline: true },
      { name: 'Umfang', value: formatScopeLabel(request), inline: true },
      { name: 'Status', value: 'Offen', inline: true }
    ]
  };

  if (media?.overview) {
    embed.description = truncate(media.overview, DESCRIPTION_PREVIEW_LENGTH);
  }

  if (request.poster_path) {
    embed.thumbnail = { url: `https://image.tmdb.org/t/p/w342${request.poster_path}` };
  }

  return embed;
}

// The embed of the settings panel's test button.
export function buildTestEmbed() {
  return {
    title: 'Testnachricht von Vanta',
    description: 'Diese Nachricht bestätigt, dass der Discord-Webhook korrekt eingerichtet ist.',
    color: EMBED_COLOR,
    timestamp: new Date().toISOString()
  };
}

// Posts an embed; never throws, the result says how it went.
export async function sendWebhookEmbed(url, embed) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS)
    });

    return { ok: response.ok, status: response.status };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// Sends to the configured webhook when it is switched on. Fire and forget:
// never throws, failures are only logged.
async function sendIfEnabled(buildEmbed) {
  try {
    const enabled = AppSettingsService.get('discord_webhook_enabled') === 'true';
    const url = AppSettingsService.get('discord_webhook_url');
    if (!enabled || !url) return;

    const result = await sendWebhookEmbed(url, buildEmbed());
    if (!result.ok) {
      console.error('[Discord Webhook] delivery failed:', result.status ?? result.error);
    }
  } catch (error) {
    console.error('[Discord Webhook] unexpected error:', error.message);
  }
}

export const sendRequestCreated = (request, media) => sendIfEnabled(() => buildRequestEmbed(request, media));

// The embed for a new problem report, in red to stand out from requests.
export function buildReportEmbed(report) {
  const year = report.production_year ? ` (${report.production_year})` : '';
  const embed = {
    title: truncate(`⚠️ Problem: ${report.title}${year}`, DISCORD_LIMITS.title),
    color: REPORT_COLOR,
    timestamp: new Date(report.created_at).toISOString(),
    fields: [
      { name: 'Problem', value: getProblemLabel(report.problem), inline: true },
      { name: 'Betrifft', value: truncate(getReportScopeLabel(report), DISCORD_LIMITS.fieldValue), inline: true },
      { name: 'Gemeldet von', value: truncate(report.username || 'Unbekannt', DISCORD_LIMITS.fieldValue), inline: true }
    ]
  };
  if (report.message) embed.description = truncate(report.message, DESCRIPTION_PREVIEW_LENGTH);
  return embed;
}

export const sendReportCreated = (report) => sendIfEnabled(() => buildReportEmbed(report));

// The webhook URL as the client may see it: origin and id, the token cut to
// its last four characters. The full URL never leaves the server again.
export function maskWebhookUrl(url) {
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

// What the admin panel shows of the webhook setting.
export function webhookStatus() {
  const url = AppSettingsService.get('discord_webhook_url');
  return {
    configured: Boolean(url),
    enabled: AppSettingsService.get('discord_webhook_enabled') === 'true',
    maskedUrl: maskWebhookUrl(url)
  };
}
