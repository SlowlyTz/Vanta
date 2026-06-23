import env from '../config/env.js';

const SENSITIVE_QUERY_PARAMS = ['api_key', 'access_token', 'x-emby-token', 'X-Emby-Token', 'ApiKey'];
const PLAYBACK_SUBTITLE_QUERY_PARAMS = [
  'SubtitleStreamIndex',
  'SubtitleMethod',
  'SubtitleCodec',
  'SubtitleOffset'
];

const QUALITY_PROFILES = [
  { id: '1080p', label: '1080p', maxHeight: 1080, maxStreamingBitrate: 8_000_000 },
  { id: '720p', label: '720p', maxHeight: 720, maxStreamingBitrate: 4_000_000 },
  { id: '480p', label: '480p', maxHeight: 480, maxStreamingBitrate: 2_000_000 },
  { id: '360p', label: '360p', maxHeight: 360, maxStreamingBitrate: 1_000_000 }
];
const BITMAP_SUBTITLE_CODECS = new Set([
  'dvbsub',
  'dvb_subtitle',
  'dvdsub',
  'dvd_subtitle',
  'hdmv_pgs_subtitle',
  'pgs',
  'pgssub',
  'vobsub',
  'xsub'
]);
const SUBTITLE_TYPES = new Map([
  ['subrip', 'srt'],
  ['srt', 'srt'],
  ['vtt', 'vtt'],
  ['webvtt', 'vtt']
]);

const getFirstValue = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.split(',')[0].trim().toLowerCase();
};

const deleteQueryParams = (url, params) => {
  const names = new Set(params.map(param => param.toLowerCase()));
  [...url.searchParams.keys()].forEach(key => {
    if (names.has(key.toLowerCase())) url.searchParams.delete(key);
  });
};

const getMediaStream = (source, type) => {
  const streams = Array.isArray(source?.MediaStreams) ? source.MediaStreams : [];
  return streams.find(stream => String(stream.Type).toLowerCase() === type);
};

const getMediaStreams = (source, type) => {
  const streams = Array.isArray(source?.MediaStreams) ? source.MediaStreams : [];
  return streams.filter(stream => String(stream.Type).toLowerCase() === type);
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

const resolveQualityProfileId = (playback, requestedProfile) => {
  if (requestedProfile === 'direct') {
    const isDirect = playback?.playMethod === 'DirectPlay' || playback?.playMethod === 'DirectStream';
    return isDirect ? 'direct' : 'auto';
  }
  if (QUALITY_PROFILES.some(profile => profile.id === requestedProfile)) {
    return requestedProfile;
  }
  return 'auto';
};

const buildQualityProfiles = (source, forceHlsTranscoding) => {
  const directPlayCapable = !forceHlsTranscoding && Boolean(source?.SupportsDirectPlay);
  const profiles = QUALITY_PROFILES.map(profile => ({
    id: profile.id,
    label: profile.label,
    maxHeight: profile.maxHeight,
    maxStreamingBitrate: profile.maxStreamingBitrate
  }));

  if (directPlayCapable) {
    profiles.unshift({ id: 'direct', label: 'Direct Play', maxHeight: null, maxStreamingBitrate: null });
  }

  profiles.unshift({ id: 'auto', label: 'Auto', maxHeight: null, maxStreamingBitrate: null });
  return profiles;
};

const getSubtitleType = (stream) => {
  const deliveryPath = String(stream?.DeliveryUrl || '').split('?')[0].toLowerCase();
  if (deliveryPath.endsWith('.vtt')) return 'vtt';
  if (deliveryPath.endsWith('.srt') || deliveryPath.endsWith('.subrip')) return 'srt';

  const codec = getFirstValue(stream?.Codec);
  return SUBTITLE_TYPES.get(codec) || null;
};

const isSupportedSubtitleStream = (stream) => {
  const codec = getFirstValue(stream?.Codec);
  return !BITMAP_SUBTITLE_CODECS.has(codec)
    && stream?.DeliveryMethod === 'External'
    && typeof stream?.DeliveryUrl === 'string'
    && stream.DeliveryUrl.length > 0
    && Boolean(getSubtitleType(stream));
};

export class PlaybackService {
  static resolvePlayback(playbackInfo, itemId, { forceHlsTranscoding = false, requestedQualityProfile = 'auto' } = {}) {
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
        forceHlsTranscoding: true,
        playSessionId: playbackInfo?.PlaySessionId,
        playMethod: 'Transcode',
        requestedQualityProfile,
        itemId
      });
    }

    if (source.DirectStreamUrl) {
      return this.buildPlaybackResponse({
        source,
        targetPath: source.DirectStreamUrl,
        isTranscoded: false,
        playSessionId: playbackInfo?.PlaySessionId,
        playMethod: 'DirectStream',
        requestedQualityProfile,
        itemId
      });
    }

    if (source.TranscodingUrl) {
      return this.buildPlaybackResponse({
        source,
        targetPath: source.TranscodingUrl,
        isTranscoded: true,
        playSessionId: playbackInfo?.PlaySessionId,
        playMethod: 'Transcode',
        requestedQualityProfile,
        itemId
      });
    }

    if ((source.SupportsDirectPlay || source.SupportsDirectStream) && itemId) {
      const params = new URLSearchParams({ static: 'true' });
      if (source.Id) params.set('mediaSourceId', source.Id);
      return this.buildPlaybackResponse({
        source,
        targetPath: `/Videos/${encodeURIComponent(itemId)}/stream?${params.toString()}`,
        isTranscoded: false,
        playSessionId: playbackInfo?.PlaySessionId,
        playMethod: source.SupportsDirectPlay ? 'DirectPlay' : 'DirectStream',
        requestedQualityProfile,
        itemId
      });
    }

    throw new Error('Jellyfin hat keine Wiedergabe-URL bereitgestellt.');
  }

  static buildPlaybackResponse({
    source,
    targetPath,
    isTranscoded,
    forceHlsTranscoding = false,
    playSessionId = null,
    playMethod = null,
    requestedQualityProfile = 'auto',
    itemId = null
  }) {
    const normalizedPath = this.normalizeJellyfinPath(targetPath, {
      stripPlaybackSubtitles: true
    });
    const metadata = getSourceMetadata(source);
    const resolvedPlayMethod = playMethod || (isTranscoded ? 'Transcode' : 'DirectPlay');
    const audioStreamIndex = source?.DefaultAudioStreamIndex ?? null;
    const subtitles = this.buildSubtitleTracks(source);
    const qualityProfiles = buildQualityProfiles(source, forceHlsTranscoding);
    const currentProfileId = resolveQualityProfileId(
      { playMethod: resolvedPlayMethod },
      requestedQualityProfile
    );
    const sourceId = source?.Id || null;

    return {
      delivery: this.isHlsPath(normalizedPath) ? 'hls' : 'http',
      isTranscoded,
      url: this.toProxyUrl(normalizedPath),
      forceHlsTranscoding,
      mediaSourceId: sourceId,
      playSessionId: playSessionId || null,
      playMethod: resolvedPlayMethod,
      audioStreamIndex,
      subtitleStreamIndex: null,
      subtitles,
      container: metadata.container || null,
      videoCodec: metadata.videoCodec || null,
      audioCodec: metadata.audioCodec || null,
      capabilities: {
        directPlay: !forceHlsTranscoding && Boolean(source?.SupportsDirectPlay),
        directStream: !forceHlsTranscoding && Boolean(source?.SupportsDirectStream),
        hls: true,
        pictureInPicture: true,
        qualityProfiles
      },
      quality: {
        current: currentProfileId,
        profiles: qualityProfiles
      }
    };
  }

  static buildSubtitleTracks(source) {
    return getMediaStreams(source, 'subtitle')
      .filter(isSupportedSubtitleStream)
      .map(stream => ({
        id: String(stream.Index),
        index: Number(stream.Index),
        label: stream.DisplayTitle || stream.Title || stream.Language || `Untertitel ${stream.Index}`,
        language: stream.Language || '',
        codec: getFirstValue(stream.Codec) || null,
        type: getSubtitleType(stream),
        isForced: Boolean(stream.IsForced),
        isDefault: Boolean(stream.IsDefault),
        url: this.toProxyUrl(stream.DeliveryUrl)
      }))
      .filter(track => Number.isInteger(track.index) && track.type && track.url);
  }

  static normalizeJellyfinPath(pathOrUrl, { stripPlaybackSubtitles = false } = {}) {
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
