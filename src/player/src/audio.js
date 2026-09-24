// The audio tracks the server offers for the current source. The settings
// flyout lists them; a choice reloads the stream with that track.
export function createAudioController({ onSelect }) {
  let tracks = [];
  let currentIndex = null;

  return {
    update(nextTracks, nextIndex) {
      tracks = Array.isArray(nextTracks) ? nextTracks : [];
      currentIndex = Number.isInteger(nextIndex) ? nextIndex : (tracks.find(track => track.isDefault)?.index ?? null);
    },
    select(index) {
      if (!Number.isInteger(index) || index === currentIndex) return;
      onSelect(index);
    },
    getOptions: () => tracks.map(track => ({ id: track.index, label: track.label, selected: track.index === currentIndex })),
    getCurrentLabel: () => tracks.find(track => track.index === currentIndex)?.label || 'Standard',
    getCurrentIndex: () => currentIndex,
    getCurrentLanguage: () => tracks.find(track => track.index === currentIndex)?.language || null,
    hasChoices: () => tracks.length > 1
  };
}
