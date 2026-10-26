// The quality steps of the player's menu and the caps they put on a stream.

export const QUALITY_PROFILES = [
  { id: '1080p', label: '1080p', maxHeight: 1080, maxStreamingBitrate: 8_000_000 },
  { id: '720p', label: '720p', maxHeight: 720, maxStreamingBitrate: 4_000_000 },
  { id: '480p', label: '480p', maxHeight: 480, maxStreamingBitrate: 2_000_000 },
  { id: '360p', label: '360p', maxHeight: 360, maxStreamingBitrate: 1_000_000 }
];

// What the player may ask for: the steps plus "auto" and "direct".
export const isValidQualityProfile = profileId => profileId === 'auto' || profileId === 'direct' || QUALITY_PROFILES.some(profile => profile.id === profileId);

// The caps a step puts on Jellyfin's stream; null leaves it free.
export const getQualityConstraints = profileId => {
  const profile = QUALITY_PROFILES.find(entry => entry.id === profileId);
  return profile ? { maxHeight: profile.maxHeight, maxStreamingBitrate: profile.maxStreamingBitrate } : null;
};

export const resolveQualityProfileId = (playback, requestedProfile) => {
  if (requestedProfile === 'direct') {
    const isDirect = playback?.playMethod === 'DirectPlay' || playback?.playMethod === 'DirectStream';
    return isDirect ? 'direct' : 'auto';
  }
  if (QUALITY_PROFILES.some(profile => profile.id === requestedProfile)) {
    return requestedProfile;
  }
  return 'auto';
};

export const buildQualityProfiles = (source, forceHlsTranscoding) => {
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
