import env from '../config/env.js';

const SENSITIVE_QUERY_PARAMS = ['api_key', 'access_token', 'x-emby-token', 'X-Emby-Token', 'ApiKey'];

const getFirstValue = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.split(',')[0].trim().toLowerCase();
};

const getMediaStream = (source, type) => {
  const streams = Array.isArray(source?.MediaStreams) ? source.MediaStreams : [];
  return streams.find(stream => String(stream.Type).toLowerCase() === type);
};

const getSourceMetadata = (source) => {
  const videoStream = getMediaStream(source, 'video');
  const audioStream = getMediaStream(source, 'audio');

  return {
    container: getFirstValue(source?.Container),
    videoCodec: getFirstValue(videoStream?.Codec || source?.VideoCodec),
    audioCodec: getFirstValue(audioStream?.Codec || source?.AudioCodec),
    audioChannels: Number(audioStream?.Channels || source?.DefaultAudioStream?.Channels || 0)
  };
};

export class PlaybackService {
  static resolvePlayback(playbackInfo, itemId, { forceHlsTranscoding = false } = {}) {
    const sources = Array.isArray(playbackInfo?.MediaSources) ? playbackInfo.MediaSources : [];

    if (sources.length === 0) {
      throw new Error('Keine abspielbare Medienquelle gefunden.');
    }

    const source = sources.find(s => !s.ErrorCode) || sources[0];

    if (source.ErrorCode) {
      throw new Error(source.ErrorMessage || 'Medienquelle kann nicht wiedergegeben werden.');
    }

    if (forceHlsTranscoding) {
      const hlsUrl = source.TranscodingSubProtocol === 'hls'
        ? source.TranscodingUrl
        : (this.isHlsPath(source.TranscodingUrl) ? source.TranscodingUrl : null);

      if (!hlsUrl) {
        throw new Error('Jellyfin hat keinen HLS-Transcoding-Stream bereitgestellt.');
      }

      return this.buildPlaybackResponse({
        source,
        targetPath: hlsUrl,
        isTranscoded: true,
        forceHlsTranscoding: true
      });
    }

    if (source.DirectStreamUrl) {
      return this.buildPlaybackResponse({
        source,
        targetPath: source.DirectStreamUrl,
        isTranscoded: false
      });
    }

    if (source.TranscodingUrl) {
      return this.buildPlaybackResponse({
        source,
        targetPath: source.TranscodingUrl,
        isTranscoded: true
      });
    }

    if ((source.SupportsDirectPlay || source.SupportsDirectStream) && itemId) {
      const params = new URLSearchParams({ static: 'true' });
      if (source.Id) params.set('mediaSourceId', source.Id);
      return this.buildPlaybackResponse({
        source,
        targetPath: `/Videos/${encodeURIComponent(itemId)}/stream?${params.toString()}`,
        isTranscoded: false
      });
    }

    throw new Error('Jellyfin hat keine Wiedergabe-URL bereitgestellt.');
  }

  static buildPlaybackResponse({ source, targetPath, isTranscoded, forceHlsTranscoding = false }) {
    const normalizedPath = this.normalizeJellyfinPath(targetPath);
    const metadata = getSourceMetadata(source);

    return {
      delivery: this.isHlsPath(normalizedPath) ? 'hls' : 'http',
      isTranscoded,
      url: this.toProxyUrl(normalizedPath),
      forceHlsTranscoding,
      mediaSourceId: source?.Id || null,
      container: metadata.container || null,
      videoCodec: metadata.videoCodec || null,
      audioCodec: metadata.audioCodec || null
    };
  }

  static normalizeJellyfinPath(pathOrUrl) {
    if (!pathOrUrl || typeof pathOrUrl !== 'string') {
      throw new Error('Playback target is missing.');
    }

    const baseUrl = new URL(env.JELLYFIN_BASE_URL);
    const url = new URL(pathOrUrl, baseUrl);

    if (url.origin !== baseUrl.origin) {
      throw new Error('Playback target does not belong to the configured Jellyfin server.');
    }

    SENSITIVE_QUERY_PARAMS.forEach(param => url.searchParams.delete(param));
    return `${url.pathname}${url.search}`;
  }

  static toProxyUrl(pathOrUrl) {
    const path = this.normalizeJellyfinPath(pathOrUrl);
    return `/api/media/playback/proxy?path=${encodeURIComponent(path)}`;
  }

  static isHlsPath(pathOrUrl) {
    const path = String(pathOrUrl || '').toLowerCase();
    return path.includes('.m3u8') || path.includes('master.m3u8') || path.includes('playlist');
  }

  static isPlaylistResponse(contentType, pathOrUrl) {
    const type = String(contentType || '').toLowerCase();
    return type.includes('mpegurl') || type.includes('vnd.apple') || this.isHlsPath(pathOrUrl);
  }

  static rewritePlaylist(playlist, currentPath) {
    const baseUrl = new URL(env.JELLYFIN_BASE_URL);
    const currentUrl = new URL(this.normalizeJellyfinPath(currentPath), baseUrl);

    return playlist
      .split(/\r?\n/)
      .map(line => this.rewritePlaylistLine(line, currentUrl))
      .join('\n');
  }

  static rewritePlaylistLine(line, currentUrl) {
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
  }

  static rewritePlaylistUri(uri, currentUrl) {
    if (/^(data|blob):/i.test(uri)) return uri;

    const targetUrl = new URL(uri, currentUrl);
    const baseUrl = new URL(env.JELLYFIN_BASE_URL);

    if (targetUrl.origin !== baseUrl.origin) return uri;
    return this.toProxyUrl(targetUrl.toString());
  }
}
