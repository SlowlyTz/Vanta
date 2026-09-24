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

// The audio streams of a media source as the player lists them.
export function buildAudioTracks(source) {
  return getMediaStreams(source, 'audio').map(stream => ({
    index: stream.Index,
    language: stream.Language ? String(stream.Language).toLowerCase() : null,
    label: audioTrackLabel(stream),
    codec: stream.Codec || null,
    channels: Number(stream.Channels) || null,
    isDefault: Boolean(stream.IsDefault)
  }));
}

// The stream index for a remembered language, or null if the source has no
// such track (the server's default then stays).
export function pickAudioStreamIndex(source, language) {
  const wanted = String(language || '').toLowerCase();
  if (!wanted) return null;
  const tracks = buildAudioTracks(source).filter(track => track.language === wanted);
  return (tracks.find(track => track.isDefault) || tracks[0])?.index ?? null;
}
