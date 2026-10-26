// Picks the stream to play from Jellyfin's PlaybackInfo and shapes the player's
// playback response (proxy URL, tracks, subtitles, quality steps).
import { getSourceMetadata } from './mediaMetadata.js';
import { buildAudioTracks } from './audioTracks.js';
import { buildQualityProfiles, resolveQualityProfileId } from './qualityProfiles.js';
import { isHlsPath, normalizeJellyfinPath, toProxyUrl, withPlaySessionId } from './pathUtils.js';
import { buildSubtitleTracks } from './subtitles.js';

export function resolvePlayback(playbackInfo, itemId, { forceHlsTranscoding = false, requestedQualityProfile = 'auto', audioStreamIndex = null } = {}) {
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
      : (isHlsPath(source.TranscodingUrl) ? source.TranscodingUrl : null);

    if (!hlsUrl) {
      throw new Error('Jellyfin hat keinen HLS-Transcoding-Stream bereitgestellt.');
    }

    return buildPlaybackResponse({
      source,
      targetPath: hlsUrl,
      isTranscoded: true,
      forceHlsTranscoding: true,
      playSessionId: playbackInfo?.PlaySessionId,
      playMethod: 'Transcode',
      requestedQualityProfile,
      requestedAudioStreamIndex: audioStreamIndex,
      itemId
    });
  }

  if (source.DirectStreamUrl) {
    return buildPlaybackResponse({
      source,
      targetPath: source.DirectStreamUrl,
      isTranscoded: false,
      playSessionId: playbackInfo?.PlaySessionId,
      playMethod: 'DirectStream',
      requestedQualityProfile,
      requestedAudioStreamIndex: audioStreamIndex,
      itemId
    });
  }

  if (source.TranscodingUrl) {
    return buildPlaybackResponse({
      source,
      targetPath: source.TranscodingUrl,
      isTranscoded: true,
      playSessionId: playbackInfo?.PlaySessionId,
      playMethod: 'Transcode',
      requestedQualityProfile,
      requestedAudioStreamIndex: audioStreamIndex,
      itemId
    });
  }

  if ((source.SupportsDirectPlay || source.SupportsDirectStream) && itemId) {
    const params = new URLSearchParams({ static: 'true' });
    if (source.Id) params.set('mediaSourceId', source.Id);
    return buildPlaybackResponse({
      source,
      targetPath: `/Videos/${encodeURIComponent(itemId)}/stream?${params.toString()}`,
      isTranscoded: false,
      playSessionId: playbackInfo?.PlaySessionId,
      playMethod: source.SupportsDirectPlay ? 'DirectPlay' : 'DirectStream',
      requestedQualityProfile,
      requestedAudioStreamIndex: audioStreamIndex,
      itemId
    });
  }

  throw new Error('Jellyfin hat keine Wiedergabe-URL bereitgestellt.');
}

export function buildPlaybackResponse({
  source,
  targetPath,
  isTranscoded,
  forceHlsTranscoding = false,
  playSessionId = null,
  playMethod = null,
  requestedQualityProfile = 'auto',
  requestedAudioStreamIndex = null,
  itemId = null
}) {
  const normalizedPath = withPlaySessionId(normalizeJellyfinPath(targetPath, {
    stripPlaybackSubtitles: true
  }), playSessionId);
  const metadata = getSourceMetadata(source);
  const resolvedPlayMethod = playMethod || (isTranscoded ? 'Transcode' : 'DirectPlay');
  const audioStreamIndex = Number.isInteger(requestedAudioStreamIndex)
    ? requestedAudioStreamIndex
    : source?.DefaultAudioStreamIndex ?? null;
  const audioTracks = buildAudioTracks(source, { keepIndex: audioStreamIndex });
  const subtitles = buildSubtitleTracks(source);
  const qualityProfiles = buildQualityProfiles(source, forceHlsTranscoding);
  const currentProfileId = resolveQualityProfileId(
    { playMethod: resolvedPlayMethod },
    requestedQualityProfile
  );
  const sourceId = source?.Id || null;

  return {
    delivery: isHlsPath(normalizedPath) ? 'hls' : 'http',
    isTranscoded,
    url: toProxyUrl(normalizedPath),
    forceHlsTranscoding,
    mediaSourceId: sourceId,
    playSessionId: playSessionId || null,
    playMethod: resolvedPlayMethod,
    audioStreamIndex,
    audioTracks,
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
