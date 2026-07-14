import { getSourceMetadata } from './mediaMetadata.js';
import { buildQualityProfiles, resolveQualityProfileId } from './qualityProfiles.js';

export const streamSelectionMethods = {
  resolvePlayback(playbackInfo, itemId, { forceHlsTranscoding = false, requestedQualityProfile = 'auto' } = {}) {
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
  },

  buildPlaybackResponse({
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
};
