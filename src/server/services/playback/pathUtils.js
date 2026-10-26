// Jellyfin stream paths: normalising, mapping to the playback proxy, rewriting HLS playlists.
import env from '../../config/env.js';
import { SENSITIVE_QUERY_PARAMS, PLAYBACK_SUBTITLE_QUERY_PARAMS, deleteQueryParams } from './mediaMetadata.js';

export function normalizeJellyfinPath(pathOrUrl, { stripPlaybackSubtitles = false } = {}) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') {
    throw new Error('Wiedergabeziel fehlt.');
  }

  const baseUrl = new URL(env.JELLYFIN_BASE_URL);
  const url = new URL(pathOrUrl, baseUrl);

  if (url.origin !== baseUrl.origin) {
    throw new Error('Das Wiedergabeziel gehört nicht zum eingestellten Jellyfin-Server.');
  }

  deleteQueryParams(url, SENSITIVE_QUERY_PARAMS);
  if (stripPlaybackSubtitles) {
    deleteQueryParams(url, PLAYBACK_SUBTITLE_QUERY_PARAMS);
  }
  return `${url.pathname}${url.search}`;
}

// Which play session a proxied path belongs to; null for subtitle files,
// undefined when the path may not be proxied at all (only /Videos/).
export function streamSessionOf(path) {
  const url = new URL(path, 'http://jellyfin');
  const segments = url.pathname.split('/');
  if (segments[1]?.toLowerCase() !== 'videos' || !segments[2]) return undefined;
  if (segments.some(segment => segment.toLowerCase() === 'subtitles')) return { itemId: segments[2], playSessionId: null };
  for (const [key, value] of url.searchParams) {
    if (key.toLowerCase() === 'playsessionid' && value) return { itemId: segments[2], playSessionId: value };
  }
  return undefined;
}

// The proxy only serves streams of a tracked session, so the stream URL
// carries its session even where Jellyfin leaves it out (static files).
export function withPlaySessionId(path, playSessionId) {
  if (!playSessionId) return path;
  const url = new URL(path, 'http://jellyfin');
  if ([...url.searchParams.keys()].some(key => key.toLowerCase() === 'playsessionid')) return path;
  url.searchParams.set('PlaySessionId', playSessionId);
  return `${url.pathname}${url.search}`;
}

export function toProxyUrl(pathOrUrl) {
  const path = normalizeJellyfinPath(pathOrUrl);
  return `/api/media/playback/proxy?path=${encodeURIComponent(path)}`;
}

export function isHlsPath(pathOrUrl) {
  const path = String(pathOrUrl || '').toLowerCase();
  return path.includes('.m3u8') || path.includes('master.m3u8') || path.includes('playlist');
}

export function isPlaylistResponse(contentType, pathOrUrl) {
  const type = String(contentType || '').toLowerCase();
  return type.includes('mpegurl') || type.includes('vnd.apple') || isHlsPath(pathOrUrl);
}

export function rewritePlaylist(playlist, currentPath) {
  const baseUrl = new URL(env.JELLYFIN_BASE_URL);
  const currentUrl = new URL(normalizeJellyfinPath(currentPath), baseUrl);

  return playlist
    .split(/\r?\n/)
    .map(line => rewritePlaylistLine(line, currentUrl))
    .join('\n');
}

export function rewritePlaylistLine(line, currentUrl) {
  const trimmed = line.trim();
  if (!trimmed) return line;

  if (trimmed.startsWith('#')) {
    return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
      const rewrittenUri = rewritePlaylistUri(uri, currentUrl);
      return `URI="${rewrittenUri}"`;
    });
  }

  const leadingWhitespace = line.slice(0, line.indexOf(trimmed));
  return `${leadingWhitespace}${rewritePlaylistUri(trimmed, currentUrl)}`;
}

export function rewritePlaylistUri(uri, currentUrl) {
  if (/^(data|blob):/i.test(uri)) return uri;

  const targetUrl = new URL(uri, currentUrl);
  const baseUrl = new URL(env.JELLYFIN_BASE_URL);

  if (targetUrl.origin !== baseUrl.origin) return uri;
  return toProxyUrl(targetUrl.toString());
}
