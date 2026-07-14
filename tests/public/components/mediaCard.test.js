import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaCard } from '../../../src/public/js/components/mediaCard.js';

describe('MediaCard', () => {
  beforeEach(() => {
    window.location.hash = '#/profile';
    sessionStorage.clear();
  });

  it('navigates to the series detail route using the Series Id, not an episode Id', () => {
    const series = {
      Id: 's1',
      Type: 'Series',
      Name: 'Breaking Bad',
      ChildCount: 5,
      ImageTags: { Primary: 'tag' }
    };

    const card = MediaCard({ item: series, sourceType: 'profile' });
    card.click();

    expect(window.location.hash).toBe('#/item/s1');
  });

  it('shows the series name, SERIE badge and season count instead of an episode label', () => {
    const series = {
      Id: 's1',
      Type: 'Series',
      Name: 'Breaking Bad',
      ChildCount: 5,
      ImageTags: { Primary: 'tag' }
    };

    const card = MediaCard({ item: series });

    expect(card.querySelector('.media-card-title').textContent).toBe('Breaking Bad');
    expect(card.querySelector('.media-card-badge').textContent).toBe('SERIE');
    expect(card.querySelector('.media-card-subtitle').textContent).toBe('5 Staffeln');
    expect(card.textContent).not.toMatch(/S\d{2}E\d{2}/);
  });

  it('navigates using the movie Id for movie cards', () => {
    const movie = { Id: 'm1', Type: 'Movie', Name: 'Inception', ProductionYear: 2010 };

    const card = MediaCard({ item: movie });
    card.click();

    expect(window.location.hash).toBe('#/item/m1');
  });
});
