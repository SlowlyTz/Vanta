import env from '../../config/env.js';
import { SENSITIVE_QUERY_PARAMS, PLAYBACK_SUBTITLE_QUERY_PARAMS, deleteQueryParams } from './mediaMetadata.js';

export const pathMethods = {
  normalizeJellyfinPath(pathOrUrl, { stripPlaybackSubtitles = false } = {}) {
    if (!pathOrUrl || typeof pathOrUrl !== 'string') {
      throw new Error('Playback target is missing.');
    }

    const baseUrl = new URL(env.JELLYFIN_BASE_URL);
    const url = new URL(pathOrUrl, baseUrl);

    if (url.origin !== baseUrl.origin) {
      throw new Error('Playback target does not belong to the configured Jellyfin server.');
    }

    deleteQueryParams(url, SENSITIVE_QUERY_PARAMS);
    if (stripPlaybackSubtitles) {
      deleteQueryParams(url, PLAYBACK_SUBTITLE_QUERY_PARAMS);
    }
    return `${url.pathname}${url.search}`;
  },

  toProxyUrl(pathOrUrl) {
    const path = this.normalizeJellyfinPath(pathOrUrl);
    return `/api/media/playback/proxy?path=${encodeURIComponent(path)}`;
  },

  isHlsPath(pathOrUrl) {
    const path = String(pathOrUrl || '').toLowerCase();
    return path.includes('.m3u8') || path.includes('master.m3u8') || path.includes('playlist');
  },

  isPlaylistResponse(contentType, pathOrUrl) {
    const type = String(contentType || '').toLowerCase();
    return type.includes('mpegurl') || type.includes('vnd.apple') || this.isHlsPath(pathOrUrl);
  },

  rewritePlaylist(playlist, currentPath) {
    const baseUrl = new URL(env.JELLYFIN_BASE_URL);
    const currentUrl = new URL(this.normalizeJellyfinPath(currentPath), baseUrl);

    return playlist
      .split(/\r?\n/)
      .map(line => this.rewritePlaylistLine(line, currentUrl))
      .join('\n');
  },

  rewritePlaylistLine(line, currentUrl) {
    const trimmed = line.trim();
    if (!trimmed) return line;

    if (trimmed.startsWith('#')) {
      return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
        const rewrittenUri = this.rewritePlaylistUri(uri, currentUrl);
        return `URI="${rewrittenUri}"`;
      });
    }

    const leadingWhitespace = line.slice(0, line.indexOf(trimmed));
    return `${leadingWhitespace}${this.rewritePlaylistUri(trimmed, currentUrl)}`;
  },

  rewritePlaylistUri(uri, currentUrl) {
    if (/^(data|blob):/i.test(uri)) return uri;

    const targetUrl = new URL(uri, currentUrl);
    const baseUrl = new URL(env.JELLYFIN_BASE_URL);

    if (targetUrl.origin !== baseUrl.origin) return uri;
    return this.toProxyUrl(targetUrl.toString());
  }
};
