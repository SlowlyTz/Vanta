const QUALITY_PROFILE_IDS = new Set(['auto', 'direct', '1080p', '720p', '480p', '360p']);

const QUALITY_PROFILES = new Map([
  ['1080p', { maxHeight: 1080, maxStreamingBitrate: 8_000_000 }],
  ['720p', { maxHeight: 720, maxStreamingBitrate: 4_000_000 }],
  ['480p', { maxHeight: 480, maxStreamingBitrate: 2_000_000 }],
  ['360p', { maxHeight: 360, maxStreamingBitrate: 1_000_000 }]
]);

export const isValidQualityProfile = profileId => QUALITY_PROFILE_IDS.has(profileId);

export const getQualityConstraints = profileId => {
  if (profileId === 'direct' || profileId === 'auto') return null;
  return QUALITY_PROFILES.get(profileId) || null;
};
