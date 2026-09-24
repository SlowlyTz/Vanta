import { getMediaStreams } from './mediaMetadata.js';

const LANGUAGE_NAMES = {
  ger: 'Deutsch', deu: 'Deutsch', de: 'Deutsch',
  eng: 'Englisch', en: 'Englisch',
  fre: 'Französisch', fra: 'Französisch', fr: 'Französisch',
  spa: 'Spanisch', es: 'Spanisch',
  ita: 'Italienisch', it: 'Italienisch',
  jpn: 'Japanisch', ja: 'Japanisch',
  kor: 'Koreanisch', ko: 'Koreanisch',
  rus: 'Russisch', ru: 'Russisch',
  tur: 'Türkisch', tr: 'Türkisch',
  pol: 'Polnisch', pl: 'Polnisch',
  dut: 'Niederländisch', nld: 'Niederländisch', nl: 'Niederländisch'
};

export function channelLabel(stream) {
  if (stream?.ChannelLayout && /\d/.test(stream.ChannelLayout)) return String(stream.ChannelLayout).replace(/\(.*\)/, '').trim();
  const channels = Number(stream?.Channels);
  if (channels === 1) return 'Mono';
  if (channels === 2) return '2.0';
  if (channels === 6) return '5.1';
  if (channels === 8) return '7.1';
  return null;
}

export function audioTrackLabel(stream) {
  const code = String(stream?.Language || '').toLowerCase();
  const name = stream?.Title || LANGUAGE_NAMES[code] || stream?.DisplayLanguage || (code && code !== 'und' ? code.toUpperCase() : null) || `Tonspur ${stream?.Index ?? ''}`.trim();
  const channels = channelLabel(stream);
  return channels ? `${name} · ${channels}` : name;
}

function listAudioTracks(source) {
  return getMediaStreams(source, 'audio').map(stream => ({
    index: stream.Index,
    language: stream.Language ? String(stream.Language).toLowerCase() : null,
    label: audioTrackLabel(stream),
    codec: stream.Codec || null,
    channels: Number(stream.Channels) || null,
    isDefault: Boolean(stream.IsDefault)
  }));
}

// The audio streams of a media source as the player lists them. Tracks that
// would read the same ("Deutsch · 5.1" in AC3 and in DTS) show up once: the
// one currently playing (`keepIndex`), else the default, else the first; it
// takes the place of the first of its name.
export function buildAudioTracks(source, { keepIndex = null } = {}) {
  const tracks = listAudioTracks(source);
  const rank = track => (track.index === keepIndex ? 2 : track.isDefault ? 1 : 0);
  const byLabel = new Map();
  tracks.forEach(track => {
    const chosen = byLabel.get(track.label);
    if (!chosen || rank(track) > rank(chosen)) byLabel.set(track.label, track);
  });
  const seen = new Set();
  return tracks
    .filter(track => !seen.has(track.label) && seen.add(track.label))
    .map(track => byLabel.get(track.label));
}

// The stream index for a remembered language, or null if the source has no
// such track (the server's default then stays).
export function pickAudioStreamIndex(source, language) {
  const wanted = String(language || '').toLowerCase();
  if (!wanted) return null;
  const tracks = listAudioTracks(source).filter(track => track.language === wanted);
  return (tracks.find(track => track.isDefault) || tracks[0])?.index ?? null;
}
