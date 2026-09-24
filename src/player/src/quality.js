export function formatBitrate(bitrate) {
  if (!bitrate) return '';
  if (bitrate >= 1_000_000) return `${(bitrate / 1_000_000).toFixed(0)} Mbit/s`;
  if (bitrate >= 1_000) return `${(bitrate / 1_000).toFixed(0)} kbit/s`;
  return `${bitrate} bit/s`;
}

export function formatProfileLabel(profile) {
  if (profile.id === 'auto') return 'Auto';
  if (profile.id === 'direct') return 'Direct Play';
  const bitrate = formatBitrate(profile.maxStreamingBitrate);
  return bitrate ? `${profile.label} (${bitrate})` : profile.label;
}

export function sortQualityProfiles(profiles) {
  const order = new Map([
    ['auto', 0],
    ['direct', 1],
    ['1080p', 2],
    ['720p', 3],
    ['480p', 4],
    ['360p', 5]
  ]);

  return [...profiles].sort((a, b) => {
    const orderA = order.get(a.id) ?? 99;
    const orderB = order.get(b.id) ?? 99;
    return orderA - orderB;
  });
}

// Holds the quality profiles the server offers for the current source; the
// settings flyout lists them and hands a choice to `onSelect`.
export function createQualityController({ onSelect }) {
  let currentId = 'auto';
  let profiles = [];

  return {
    update(nextProfiles, nextCurrentId) {
      profiles = sortQualityProfiles(nextProfiles || []);
      currentId = nextCurrentId || 'auto';
    },
    select(profileId) {
      if (!profileId || profileId === currentId) return;
      onSelect(profileId);
    },
    getOptions: () => profiles.map(profile => ({
      id: profile.id,
      label: formatProfileLabel(profile),
      selected: profile.id === currentId
    })),
    getCurrentId: () => currentId,
    getCurrentLabel: () => {
      const current = profiles.find(profile => profile.id === currentId);
      return current ? formatProfileLabel(current) : 'Auto';
    },
    hasChoices: () => profiles.length > 1
  };
}
