import { describe, it, expect } from 'vitest';
import { audioTrackLabel, buildAudioTracks, channelLabel, pickAudioStreamIndex } from '../../../src/server/services/playback/audioTracks.js';

const source = {
  MediaStreams: [
    { Type: 'Video', Index: 0 },
    { Type: 'Audio', Index: 1, Language: 'eng', Channels: 6, Codec: 'eac3', IsDefault: true },
    { Type: 'Audio', Index: 2, Language: 'ger', ChannelLayout: '5.1(side)', Codec: 'ac3' },
    { Type: 'Audio', Index: 3, Language: 'ger', Title: 'Deutsch – Audiodeskription', Channels: 2 },
    { Type: 'Subtitle', Index: 4, Language: 'ger' }
  ]
};

describe('audioTracks', () => {
  it('listet nur Tonspuren mit lesbarem Namen und Kanälen', () => {
    expect(buildAudioTracks(source)).toEqual([
      { index: 1, language: 'eng', label: 'Englisch · 5.1', codec: 'eac3', channels: 6, isDefault: true },
      { index: 2, language: 'ger', label: 'Deutsch · 5.1', codec: 'ac3', channels: null, isDefault: false },
      { index: 3, language: 'ger', label: 'Deutsch – Audiodeskription · 2.0', codec: null, channels: 2, isDefault: false }
    ]);
  });

  it('beschriftet unbekannte Sprachen und Kanalzahlen vernünftig', () => {
    expect(audioTrackLabel({ Index: 7, Language: 'und' })).toBe('Tonspur 7');
    expect(audioTrackLabel({ Index: 7, Language: 'swe', Channels: 1 })).toBe('SWE · Mono');
    expect(channelLabel({ Channels: 8 })).toBe('7.1');
    expect(channelLabel({})).toBeNull();
  });

  it('findet die Spur zur gemerkten Sprache, bei mehreren die erste', () => {
    expect(pickAudioStreamIndex(source, 'GER')).toBe(2);
    expect(pickAudioStreamIndex(source, 'eng')).toBe(1);
    expect(pickAudioStreamIndex(source, 'jpn')).toBeNull();
    expect(pickAudioStreamIndex(source, null)).toBeNull();
  });
});
