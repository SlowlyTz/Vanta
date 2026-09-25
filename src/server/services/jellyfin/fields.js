export const COMMON_ITEM_FIELDS = [
  'PrimaryImageAspectRatio',
  'BasicSyncInfo',
  'Overview',
  'Genres',
  'ProviderIds',
  'PremiereDate',
  'ProductionYear',
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

export const TRAILER_ITEM_FIELDS = [
  COMMON_ITEM_FIELDS,
  'RemoteTrailers',
  'ExternalUrls',
  'OfficialRating',
  'CommunityRating',
  'CriticRating',
  'OriginalTitle'
].join(',');

// H.264 the browser decodes itself: Jellyfin copies such a video stream into
// the HLS segments instead of re-encoding it. Anything outside these limits
// (10-bit, HDR, interlaced, level > 5.2) is still transcoded. A quality
// profile's height cap applies to both, so a copy only happens when the
// source already fits.
function buildH264CodecProfile(maxHeight) {
  const conditions = [
    { Condition: 'NotEquals', Property: 'IsAnamorphic', Value: 'true', IsRequired: false },
    { Condition: 'EqualsAny', Property: 'VideoProfile', Value: 'high|main|baseline|constrained baseline', IsRequired: false },
    { Condition: 'EqualsAny', Property: 'VideoRangeType', Value: 'SDR', IsRequired: false },
    { Condition: 'LessThanEqual', Property: 'VideoBitDepth', Value: '8', IsRequired: false },
    { Condition: 'LessThanEqual', Property: 'VideoLevel', Value: '52', IsRequired: false },
    { Condition: 'NotEquals', Property: 'IsInterlaced', Value: 'true', IsRequired: false }
  ];
  if (Number.isInteger(maxHeight) && maxHeight > 0) {
    conditions.push({ Condition: 'LessThanEqual', Property: 'Height', Value: String(maxHeight), IsRequired: false });
  }
  return { Type: 'Video', Codec: 'h264', Conditions: conditions };
}

export function buildBrowserDeviceProfile({ forceHlsTranscoding = false, maxHeight = null } = {}) {
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
    CodecProfiles: [buildH264CodecProfile(maxHeight)],
    SubtitleProfiles: subtitleProfiles
  };
}
