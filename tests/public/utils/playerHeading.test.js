import { describe, it, expect } from 'vitest';
import { playerHeading } from '../../../src/public/js/utils/playerHeading.js';

describe('playerHeading', () => {
  it('zeigt bei Folgen die Serie als Titel und Staffel, Folge und Name darunter', () => {
    expect(playerHeading({ Type: 'Episode', SeriesName: 'Dark', Name: 'Geheimnisse', ParentIndexNumber: 1, IndexNumber: 3 }))
      .toEqual({ title: 'Dark', subtitle: 'S1 · F3 · Geheimnisse' });
    expect(playerHeading({ Type: 'Episode', SeriesName: 'Dark', Name: 'Special' }))
      .toEqual({ title: 'Dark', subtitle: 'Special' });
  });

  it('zeigt bei Filmen nur den Titel', () => {
    expect(playerHeading({ Type: 'Movie', Name: 'Heat' })).toEqual({ title: 'Heat', subtitle: '' });
    expect(playerHeading(null)).toEqual({ title: '', subtitle: '' });
  });
});
