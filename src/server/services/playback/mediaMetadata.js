export const SENSITIVE_QUERY_PARAMS = ['api_key', 'access_token', 'x-emby-token', 'X-Emby-Token', 'ApiKey'];
export const PLAYBACK_SUBTITLE_QUERY_PARAMS = [
  'SubtitleStreamIndex',
  'SubtitleMethod',
  'SubtitleCodec',
  'SubtitleOffset'
];

export const getFirstValue = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.split(',')[0].trim().toLowerCase();
};

export const deleteQueryParams = (url, params) => {
  const names = new Set(params.map(param => param.toLowerCase()));
  [...url.searchParams.keys()].forEach(key => {
    if (names.has(key.toLowerCase())) url.searchParams.delete(key);
  });
};

export const getMediaStream = (source, type) => {
  const streams = Array.isArray(source?.MediaStreams) ? source.MediaStreams : [];
  return streams.find(stream => String(stream.Type).toLowerCase() === type);
};

export const getMediaStreams = (source, type) => {
  const streams = Array.isArray(source?.MediaStreams) ? source.MediaStreams : [];
  return streams.filter(stream => String(stream.Type).toLowerCase() === type);
};

export const getSourceMetadata = (source) => {
  const videoStream = getMediaStream(source, 'video');
  const audioStream = getMediaStream(source, 'audio');

  return {
    container: getFirstValue(source?.Container),
    videoCodec: getFirstValue(videoStream?.Codec || source?.VideoCodec),
    audioCodec: getFirstValue(audioStream?.Codec || source?.AudioCodec),
    audioChannels: Number(audioStream?.Channels || source?.DefaultAudioStream?.Channels || 0)
  };
};
