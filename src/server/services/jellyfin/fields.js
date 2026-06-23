export const COMMON_ITEM_FIELDS = [
  'PrimaryImageAspectRatio',
  'BasicSyncInfo',
  'Overview',
  'Genres',
  'ProviderIds',
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

export function buildBrowserDeviceProfile({ forceHlsTranscoding = false } = {}) {
  const hlsProfile = {
    Type: 'Video',
    Container: 'ts',
    Protocol: 'hls',
    Context: 'Streaming',
    VideoCodec: 'h264',
    AudioCodec: 'aac',
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
  const subtitleProfiles = [
    {
      Format: 'vtt',
      Method: 'External'
    }
  ];

  return {
    Name: 'VANTA HTML5',
    MaxStreamingBitrate: 40000000,
    MaxStaticBitrate: 100000000,
    MusicStreamingTranscodingBitrate: 384000,
    DirectPlayProfiles: forceHlsTranscoding ? [] : [
      {
        Type: 'Video',
        Container: 'mp4,m4v,mov',
        VideoCodec: 'h264',
        AudioCodec: 'aac,mp3,alac'
      }
    ],
    TranscodingProfiles: forceHlsTranscoding ? [hlsProfile] : [httpProfile, hlsProfile],
    ContainerProfiles: [],
    CodecProfiles: [],
    SubtitleProfiles: subtitleProfiles
  };
}
