// Jellyfin item field lists and the device profiles sent with PlaybackInfo.
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

// H.264 the browser decodes itself, so Jellyfin copies it into the HLS segments
// instead of re-encoding (10-bit, HDR, interlaced, level > 5.2 still transcode).
// A quality profile's height cap applies too: a copy needs a source that fits.
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

// Samsung (Tizen) and LG (webOS) TVs play HEVC, AC3/E-AC3 and MKV
// themselves; sending those as they are saves Jellyfin the transcode. Only
// for platforms recognised for sure; a file the TV cannot play after all
// falls back to HLS in the player.
const TV_DIRECT_PLATFORMS = new Set(['tizen', 'webos']);

export const isTvDirectPlatform = platform => TV_DIRECT_PLATFORMS.has(platform);

function buildHevcCodecProfile(maxHeight) {
  const conditions = [
    { Condition: 'NotEquals', Property: 'IsAnamorphic', Value: 'true', IsRequired: false },
    { Condition: 'LessThanEqual', Property: 'VideoLevel', Value: '153', IsRequired: false },
    { Condition: 'NotEquals', Property: 'IsInterlaced', Value: 'true', IsRequired: false }
  ];
  if (Number.isInteger(maxHeight) && maxHeight > 0) {
    conditions.push({ Condition: 'LessThanEqual', Property: 'Height', Value: String(maxHeight), IsRequired: false });
  }
  return { Type: 'Video', Codec: 'hevc', Conditions: conditions };
}

export function buildBrowserDeviceProfile({ forceHlsTranscoding = false, maxHeight = null, tvPlatform = null } = {}) {
  if (isTvDirectPlatform(tvPlatform)) return buildTvDeviceProfile({ forceHlsTranscoding, maxHeight, tvPlatform });
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

// The profile of a TV browser that plays more than a desktop one (see above).
function buildTvDeviceProfile({ forceHlsTranscoding, maxHeight, tvPlatform }) {
  const base = buildBrowserDeviceProfile({ forceHlsTranscoding, maxHeight });
  return {
    ...base,
    Name: `VANTA TV (${tvPlatform})`,
    MaxStreamingBitrate: 80000000,
    DirectPlayProfiles: forceHlsTranscoding ? [] : [
      { Type: 'Video', Container: 'mp4,m4v,mov,mkv,webm', VideoCodec: 'h264,hevc', AudioCodec: 'aac,mp3,ac3,eac3' }
    ],
    TranscodingProfiles: base.TranscodingProfiles.map(profile => ({ ...profile, AudioCodec: 'aac,ac3,eac3', MaxAudioChannels: '6' })),
    CodecProfiles: [...base.CodecProfiles, buildHevcCodecProfile(maxHeight)]
  };
}
