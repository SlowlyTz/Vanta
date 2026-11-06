import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../src/public/js/api/media.api.js', () => ({
  MediaApi: { getImageUrl: vi.fn(() => '/img') }
}));

import { endsAt, buildChips, buildVersionPicker } from '../../../../src/public/js/pages/detail/heroFacts.js';

const MINUTE = 60 * 10_000_000;
const now = new Date(2026, 10, 6, 20, 0);

describe('endsAt', () => {
  it('adds the runtime to now', () => {
    expect(endsAt({ RunTimeTicks: 100 * MINUTE }, now)).toBe('21:40');
  });

  it('counts a started film from its position', () => {
    expect(endsAt({ RunTimeTicks: 100 * MINUTE, UserData: { PlaybackPositionTicks: 70 * MINUTE } }, now)).toBe('20:30');
  });

  it('counts a watched film in full again', () => {
    expect(endsAt({ RunTimeTicks: 100 * MINUTE, UserData: { Played: true, PlaybackPositionTicks: 70 * MINUTE } }, now)).toBe('21:40');
  });

  it('is null without a runtime', () => {
    expect(endsAt({}, now)).toBeNull();
  });
});

describe('buildChips', () => {
  const texts = (chips) => chips.map(chip => chip.textContent);

  it('shows ratings, age rating, picture and sound and the end of a film', () => {
    const chips = buildChips(
      { Type: 'Movie', RunTimeTicks: 90 * MINUTE },
      { rating: 7, criticRating: 61, fsk: 'DE-12', media: { resolution: '4K', dynamicRange: 'HDR', audio: '5.1' } }
    );
    expect(texts(chips).slice(0, 6)).toEqual(['TMDB7,0', '61 %', 'FSK 12', '4K', 'HDR', '5.1']);
    expect(texts(chips)[6]).toMatch(/^Endet um\d\d:\d\d$/);
  });

  it('leaves out what is unknown and the end of a series', () => {
    expect(texts(buildChips({ Type: 'Series', RunTimeTicks: 45 * MINUTE }, { rating: 8.1 }))).toEqual(['TMDB8,1']);
  });
});

describe('buildVersionPicker', () => {
  const copy = (Id, resolution, size) => ({ Id, Media: { resolution, audio: '5.1', size } });

  it('is null for a film held once', () => {
    expect(buildVersionPicker({ Type: 'Movie', Id: 'a', VantaCopies: [copy('a', '1080p', 1)] }, {})).toBeNull();
  });

  it('marks the chosen version and reports it', () => {
    const onChange = vi.fn();
    const copies = [copy('a', '1080p', 2e9), copy('b', '4K', 9e9)];
    const picker = buildVersionPicker({ Type: 'Movie', Id: 'a', VantaCopies: copies }, { onChange });
    const buttons = [...picker.querySelectorAll('.detail-version')];
    expect(buttons.map(button => button.classList.contains('is-selected'))).toEqual([true, false]);

    buttons[1].click();
    expect(buttons.map(button => button.getAttribute('aria-checked'))).toEqual(['false', 'true']);
    expect(onChange).toHaveBeenCalledWith('b', copies[1]);
  });
});
