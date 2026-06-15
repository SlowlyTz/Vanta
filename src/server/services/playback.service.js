import env from '../config/env.js';

export const PLAYBACK_MODES = Object.freeze({
  TRANSCODE: 'transcode',
  COMPATIBLE: 'compatible',
  DIRECT: 'direct'
});

const DEFAULT_PLAYBACK_MODE = PLAYBACK_MODES.TRANSCODE;
const SAFE_CONTAINERS = new Set(['mp4', 'm4v', 'mov']);
const SAFE_VIDEO_CODECS = new Set(['h264', 'avc', 'avc1']);
const SAFE_AUDIO_CODECS = new Set(['aac', 'mp3', 'alac']);
const SENSITIVE_QUERY_PARAMS = ['api_key', 'access_token', 'x-emby-token', 'X-Emby-Token'];

const getFirstValue = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.split(',')[0].trim().toLowerCase();
};

const isIosUserAgent = (userAgent = '') => /iPad|iPhone|iPod/.test(userAgent)
  || (/Macintosh/.test(userAgent) && /Mobile\/\w+/.test(userAgent));

const isSafariUserAgent = (userAgent = '') => /Safari/.test(userAgent)
  && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);

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
  static normalizeMode(mode) {
    return Object.values(PLAYBACK_MODES).includes(mode) ? mode : DEFAULT_PLAYBACK_MODE;
  }

  static getPlaybackInfoOptions(mode, userAgent = '') {
    return {
      forceTranscode: this.normalizeMode(mode) === PLAYBACK_MODES.TRANSCODE,
      preferHls: this.shouldPreferHls(userAgent)
    };
  }

  static resolvePlayback(playbackInfo, itemId, { mode, userAgent } = {}) {
    const requestedMode = this.normalizeMode(mode);
    const sources = Array.isArray(playbackInfo?.MediaSources) ? playbackInfo.MediaSources : [];

    if (sources.length === 0) {
      throw new Error('Keine abspielbare Medienquelle gefunden.');
    }

    if (requestedMode === PLAYBACK_MODES.TRANSCODE) {
      return this.buildPlaybackResponse({
        requestedMode,
        ...this.selectTranscodingTarget(sources, itemId, 'Immer transkodieren ist aktiv.', userAgent)
      });
    }

    if (requestedMode === PLAYBACK_MODES.DIRECT) {
      return this.buildPlaybackResponse({
        requestedMode,
        ...this.selectDirectTarget(sources, itemId, 'Direktstream wurde bevorzugt.', userAgent)
      });
    }

    const preferredSource = this.getPreferredSource(sources);
    const compatibilityIssue = this.getCompatibilityIssue(preferredSource, userAgent);

    if (compatibilityIssue) {
      return this.buildPlaybackResponse({
        requestedMode,
        ...this.selectTranscodingTarget(sources, itemId, compatibilityIssue, userAgent)
      });
    }

    return this.buildPlaybackResponse({
      requestedMode,
      ...this.selectDirectTarget(sources, itemId, 'Quelle ist browserkompatibel.', userAgent)
    });
  }

  static selectTranscodingTarget(sources, itemId, reason, userAgent = '') {
    const transcodableSources = sources.filter(source => source.SupportsTranscoding !== false);
    const candidates = transcodableSources.length > 0 ? transcodableSources : sources;
    const preferHls = this.shouldPreferHls(userAgent);
    const hlsSource = candidates.find(source => source.TranscodingUrl && this.isHlsPath(source.TranscodingUrl));
    const httpSource = candidates.find(source => source.TranscodingUrl && !this.isHlsPath(source.TranscodingUrl));
    const source = (preferHls ? hlsSource || httpSource : httpSource)
      || this.getPreferredSource(candidates);
    const targetPath = preferHls
      ? source?.TranscodingUrl || this.buildTranscodingFallbackPath(itemId, source)
      : httpSource?.TranscodingUrl || this.buildTranscodingFallbackPath(itemId, source);

    return {
      mode: PLAYBACK_MODES.TRANSCODE,
      source,
      targetPath,
      isTranscoded: true,
      reason
    };
  }

  static selectDirectTarget(sources, itemId, reason, userAgent = '') {
    const directSource = sources.find(source => source.DirectStreamUrl)
      || sources.find(source => source.SupportsDirectPlay || source.SupportsDirectStream)
      || this.getPreferredSource(sources);

    if (!directSource?.DirectStreamUrl && !directSource?.SupportsDirectPlay && !directSource?.SupportsDirectStream) {
      return this.selectTranscodingTarget(sources, itemId, 'Direktstream ist nicht verfügbar.', userAgent);
    }

    return {
      mode: PLAYBACK_MODES.DIRECT,
      source: directSource,
      targetPath: directSource.DirectStreamUrl || this.buildDirectFallbackPath(itemId, directSource),
      isTranscoded: false,
      reason
    };
  }

  static getPreferredSource(sources) {
    return sources.find(source => !source.ErrorCode) || sources[0];
  }

  static getCompatibilityIssue(source, userAgent) {
    if (isIosUserAgent(userAgent) || isSafariUserAgent(userAgent)) {
      return 'Safari/iOS wird über einen kompatiblen HLS-Stream bedient.';
    }

    const metadata = getSourceMetadata(source);

    if (metadata.container && !SAFE_CONTAINERS.has(metadata.container)) {
      return `Container ${metadata.container.toUpperCase()} ist nicht universell browserkompatibel.`;
    }

    if (metadata.videoCodec && !SAFE_VIDEO_CODECS.has(metadata.videoCodec)) {
      return `Video-Codec ${metadata.videoCodec.toUpperCase()} ist nicht universell browserkompatibel.`;
    }

    if (metadata.audioCodec && !SAFE_AUDIO_CODECS.has(metadata.audioCodec)) {
      return `Audio-Codec ${metadata.audioCodec.toUpperCase()} ist nicht universell browserkompatibel.`;
    }

    if (metadata.audioChannels > 2) {
      return `${metadata.audioChannels} Audiokanäle werden für breite Browserkompatibilität transkodiert.`;
    }

    return null;
  }

  static shouldPreferHls(userAgent = '') {
    return isIosUserAgent(userAgent) || isSafariUserAgent(userAgent);
  }

  static buildPlaybackResponse({ requestedMode, mode, source, targetPath, isTranscoded, reason }) {
    const normalizedPath = this.normalizeJellyfinPath(targetPath);
    const metadata = getSourceMetadata(source);

    return {
      requestedMode,
      mode,
      delivery: this.isHlsPath(normalizedPath) ? 'hls' : 'http',
      isTranscoded,
      url: this.toProxyUrl(normalizedPath),
      reason,
      mediaSourceId: source?.Id || null,
      container: metadata.container || null,
      videoCodec: metadata.videoCodec || null,
      audioCodec: metadata.audioCodec || null
    };
  }

  static buildTranscodingFallbackPath(itemId, source) {
    const params = new URLSearchParams({
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
      audioChannels: '2',
      maxBitrate: '20000000',
      videoBitrate: '18000000',
      audioBitrate: '192000'
    });

    if (source?.Id) params.set('mediaSourceId', source.Id);
    return `/Videos/${encodeURIComponent(itemId)}/stream?${params.toString()}`;
  }

  static buildDirectFallbackPath(itemId, source) {
    const params = new URLSearchParams({ static: 'true' });
    if (source?.Id) params.set('mediaSourceId', source.Id);
    return `/Videos/${encodeURIComponent(itemId)}/stream?${params.toString()}`;
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
    return `/api/media/playback-proxy?path=${encodeURIComponent(path)}`;
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
