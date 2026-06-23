import { describe, it, expect } from 'vitest';
import {
  buildSubtitleMenuItems,
  formatSubtitleLabel,
  NO_SUBTITLES_LABEL,
  sortSubtitleTracks
} from '../../src/subtitles.js';

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

  it('returns an empty-state menu item when no subtitles are available', () => {
    expect(buildSubtitleMenuItems([])).toEqual([{
      id: null,
      label: NO_SUBTITLES_LABEL,
      disabled: true,
      selected: false
    }]);
  });

  it('keeps Off as the first selectable option when subtitles are available', () => {
    const items = buildSubtitleMenuItems([{ index: 3, label: 'German' }]);

    expect(items).toEqual([
      { id: 'off', label: 'Aus', disabled: false },
      { id: 'vanta-subtitle-3', label: 'German', disabled: false }
    ]);
  });
});
