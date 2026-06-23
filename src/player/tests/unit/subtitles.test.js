import { describe, it, expect } from 'vitest';
import { formatSubtitleLabel, sortSubtitleTracks } from '../../src/subtitles.js';

describe('subtitles', () => {
  it('formats forced subtitle labels explicitly', () => {
    expect(formatSubtitleLabel({
      label: 'English',
      index: 4,
      isForced: true
    })).toBe('English · Forced');
  });

  it('sorts forced and default subtitles before regular tracks', () => {
    const tracks = [
      { index: 8, label: 'French' },
      { index: 4, label: 'English Forced', isForced: true },
      { index: 3, label: 'German', isDefault: true }
    ];

    expect(sortSubtitleTracks(tracks).map(track => track.index)).toEqual([4, 3, 8]);
  });
});
