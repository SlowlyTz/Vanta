const OFF_ID = 'off';
export const NO_SUBTITLES_LABEL = 'Keine Untertitel verfügbar';

function normalizeLanguage(language) {
  return String(language || '').trim();
}

export function formatSubtitleLabel(track) {
  if (!track) return 'Aus';
  const label = track.label || track.language || `Untertitel ${track.index}`;
  return track.isForced ? `${label} · Forced` : label;
}

export function sortSubtitleTracks(tracks) {
  return [...(tracks || [])].sort((a, b) => {
    if (a.isForced !== b.isForced) return a.isForced ? -1 : 1;
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return Number(a.index) - Number(b.index);
  });
}

export function getSubtitleTrackId(track) {
  return `vanta-subtitle-${track.index}`;
}

export function buildSubtitleMenuItems(tracks) {
  if (!tracks?.length) {
    return [{
      id: null,
      label: NO_SUBTITLES_LABEL,
      disabled: true,
      selected: false
    }];
  }

  return [
    { id: OFF_ID, label: 'Aus', disabled: false },
    ...tracks.map(track => ({
      id: getSubtitleTrackId(track),
      label: formatSubtitleLabel(track),
      disabled: false
    }))
  ];
}

// Keeps the subtitle tracks of the current source registered with the player
// and switches between them. The settings flyout renders the choices.
export function createSubtitleController({ player, reporter, onChange = () => {} }) {
  let currentId = OFF_ID;
  let tracks = [];
  let registeredIds = new Set();

  const findRegisteredTrack = id => player.textTracks?.getById?.(id) || null;

  const setTrackMode = (track, mode) => {
    if (!track) return;
    if (typeof track.setMode === 'function') track.setMode(mode);
    else track.mode = mode;
  };

  const removeRegisteredTracks = () => {
    if (!player.textTracks) {
      registeredIds = new Set();
      return;
    }

    registeredIds.forEach(id => {
      const track = findRegisteredTrack(id);
      if (track && typeof player.textTracks.remove === 'function') {
        player.textTracks.remove(track);
      } else {
        setTrackMode(track, 'disabled');
      }
    });
    registeredIds = new Set();
  };

  const registerTracks = nextTracks => {
    removeRegisteredTracks();
    nextTracks.forEach(track => {
      const id = getSubtitleTrackId(track);
      registeredIds.add(id);
      player.textTracks?.add?.({
        id,
        src: track.url,
        type: track.type,
        kind: 'subtitles',
        label: formatSubtitleLabel(track),
        language: normalizeLanguage(track.language),
        default: false
      });
      setTrackMode(findRegisteredTrack(id), 'disabled');
    });
  };

  const select = nextId => {
    const selected = tracks.find(track => getSubtitleTrackId(track) === nextId);
    currentId = selected ? nextId : OFF_ID;

    registeredIds.forEach(id => {
      setTrackMode(findRegisteredTrack(id), id === currentId ? 'showing' : 'disabled');
    });

    reporter.setSubtitleStreamIndex(selected ? selected.index : null);
    onChange();
  };

  const update = (playback, { preserveSelection = true } = {}) => {
    const nextTracks = sortSubtitleTracks(playback?.subtitles || []);
    const previousId = currentId;

    tracks = nextTracks;
    registerTracks(tracks);

    const shouldPreserve = preserveSelection
      && previousId !== OFF_ID
      && tracks.some(track => getSubtitleTrackId(track) === previousId);

    select(shouldPreserve ? previousId : OFF_ID);
  };

  return {
    update,
    select,
    getOptions: () => buildSubtitleMenuItems(tracks).map(option => ({ ...option, selected: option.id === currentId })),
    getCurrentLabel: () => {
      if (!tracks.length) return 'Keine';
      const selected = tracks.find(track => getSubtitleTrackId(track) === currentId);
      return selected ? formatSubtitleLabel(selected) : 'Aus';
    },
    getCurrentId: () => currentId,
    destroy: removeRegisteredTracks
  };
}
