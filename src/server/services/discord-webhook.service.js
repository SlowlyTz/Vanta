import { AppSettingsService } from './app-settings.service.js';
import { formatScopeLabel } from './request-scope.js';
import { getProblemLabel, getReportScopeLabel } from '../../public/js/shared/reports.js';

const DISCORD_LIMITS = { title: 256, description: 4096, fieldValue: 1024 };
const DESCRIPTION_PREVIEW_LENGTH = 300;
const WEBHOOK_TIMEOUT_MS = 5000;
const EMBED_COLOR = 0x5865f2; // Discord-Blurple als fester Akzentwert
const REPORT_COLOR = 0xef4444; // Problemmeldungen heben sich rot ab
const TMDB_TYPE_LABEL = { movie: 'Film', tv: 'Serie' };

// Verhindert, dass der Webhook-Versand für POSTs an beliebige (auch interne) Netzadressen
// missbraucht wird, z. B. den Jellyfin-Server im selben Netz. Der Endpunkt ist zwar bereits
// durch requireFreshAdmin geschützt, diese Einschränkung schließt SSRF-artige Zwecke aber
// vollständig aus. Bewusst als einzelne, klar benannte Funktion isoliert, damit sie bei
// Bedarf gezielt entfernt werden kann.
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

// Baut das Embed-Objekt für eine neue Anfrage. Rein und ohne Netzwerk, damit direkt testbar.
// `media` sind die TMDB-Details (aus tmdb_media / RequestsService.create), da Jahr und
// Overview nicht in der requests-Tabelle liegen.
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

// Beispiel-Embed für den Testen-Button im Einstellungen-Panel.
export function buildTestEmbed() {
  return {
    title: 'Testnachricht von Vanta',
    description: 'Diese Nachricht bestätigt, dass der Discord-Webhook korrekt eingerichtet ist.',
    color: EMBED_COLOR,
    timestamp: new Date().toISOString()
  };
}

// Sendet ein fertiges Embed an eine Webhook-URL. Wirft nie, sondern meldet Erfolg/Fehler
// im Rückgabewert zurück, damit sowohl der Testen-Button als auch der Auto-Versand
// bei neuen Anfragen denselben Pfad nutzen können.
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

// Liest die Konfiguration, prüft den Ein/Aus-Schalter und sendet das Embed für eine neue
// Anfrage. Wirft niemals nach außen; Fehler landen nur in console.error. Der Aufrufer
// (requests.routes.js) ruft das fire-and-forget auf, der Nutzer wartet nie auf Discord.
export async function sendRequestCreated(request, media) {
  try {
    const enabled = AppSettingsService.get('discord_webhook_enabled') === 'true';
    const url = AppSettingsService.get('discord_webhook_url');
    if (!enabled || !url) return;

    const embed = buildRequestEmbed(request, media);
    const result = await sendWebhookEmbed(url, embed);

    if (!result.ok) {
      console.error('[Discord Webhook] Versand fehlgeschlagen:', result.status ?? result.error);
    }
  } catch (error) {
    console.error('[Discord Webhook] Unerwarteter Fehler beim Versand:', error.message);
  }
}

// Embed für eine neue Problemmeldung: rot, damit sie sich im Kanal von den
// Anfragen abhebt. Rein und ohne Netzwerk, damit direkt testbar.
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

// Wie sendRequestCreated: fire-and-forget, wirft nie nach außen.
export async function sendReportCreated(report) {
  try {
    const enabled = AppSettingsService.get('discord_webhook_enabled') === 'true';
    const url = AppSettingsService.get('discord_webhook_url');
    if (!enabled || !url) return;

    const result = await sendWebhookEmbed(url, buildReportEmbed(report));
    if (!result.ok) {
      console.error('[Discord Webhook] Versand fehlgeschlagen:', result.status ?? result.error);
    }
  } catch (error) {
    console.error('[Discord Webhook] Unerwarteter Fehler beim Versand:', error.message);
  }
}
