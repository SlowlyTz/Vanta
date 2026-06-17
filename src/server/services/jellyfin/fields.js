export const COMMON_ITEM_FIELDS = [
  'PrimaryImageAspectRatio',
  'BasicSyncInfo',
  'Overview',
  'Genres',
  'ImageTags',
  'BackdropImageTags',
  'ParentBackdropItemId',
  'ParentBackdropImageTags',
  'SeriesPrimaryImageTag',
  'SeriesName',
  'SeriesId',
  'SeasonName',
  'ParentIndexNumber',
  'IndexNumber',
  'ParentId',
  'AlbumPrimaryImageTag',
  'AlbumId'
].join(',');

export const DETAIL_ITEM_FIELDS = [
  COMMON_ITEM_FIELDS,
  'People',
  'Studios',
  'Taglines',
  'OfficialRating',
  'CommunityRating',
  'CriticRating',
  'OriginalTitle'
].join(',');

export function buildBrowserDeviceProfile({ forceTranscode = false, preferHls = false } = {}) {
  const hlsProfile = {
    Type: 'Video',
    Container: 'ts',
    Protocol: 'hls',
    Context: 'Streaming',
    VideoCodec: 'h264',
    AudioCodec: 'aac,mp3',
    MaxAudioChannels: '2',
    MinSegments: '2',
    BreakOnNonKeyFrames: true
  };
  const httpProfile = {
    Type: 'Video',
    Container: 'mp4',
    Protocol: 'http',
    Context: 'Streaming',
    VideoCodec: 'h264',
    AudioCodec: 'aac',
    MaxAudioChannels: '2'
  };

  return {
    Name: 'VANTA HTML5',
    MaxStreamingBitrate: 40000000,
    MaxStaticBitrate: 100000000,
    MusicStreamingTranscodingBitrate: 384000,
    DirectPlayProfiles: forceTranscode ? [] : [
      {
        Type: 'Video',
        Container: 'mp4,m4v,mov',
        VideoCodec: 'h264',
        AudioCodec: 'aac,mp3,alac'
      }
    ],
    TranscodingProfiles: preferHls ? [hlsProfile, httpProfile] : [httpProfile, hlsProfile],
    ContainerProfiles: [],
    CodecProfiles: [],
    SubtitleProfiles: []
  };
}
