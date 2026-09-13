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

  it('gives the poster image a srcset, sizes and async decoding without changing the src', () => {
    const movie = { Id: 'm1', Type: 'Movie', Name: 'Inception', ImageTags: { Primary: 'p1' } };

    const img = MediaCard({ item: movie }).querySelector('img.media-card-image');

    expect(img.getAttribute('src')).toBe('/api/media/image/m1?type=Primary&maxWidth=400&tag=p1');
    expect(img.getAttribute('srcset')).toBe([
      '/api/media/image/m1?type=Primary&maxWidth=200&tag=p1 200w',
      '/api/media/image/m1?type=Primary&maxWidth=400&tag=p1 400w',
      '/api/media/image/m1?type=Primary&maxWidth=800&tag=p1 800w'
    ].join(', '));
    expect(img.getAttribute('sizes')).toBe('(min-width: 1200px) 220px, (min-width: 768px) 180px, 160px');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
  });

  it('uses backdrop widths and landscape sizes for landscape cards', () => {
    const episode = { Id: 'e1', Type: 'Episode', Name: 'Pilot', SeriesName: 'Show', BackdropImageTags: ['b1'] };

    const img = MediaCard({ item: episode, landscape: true }).querySelector('img.media-card-image');

    expect(img.getAttribute('src')).toBe('/api/media/image/e1?type=Backdrop&maxWidth=1280&tag=b1');
    expect(img.getAttribute('srcset')).toContain('maxWidth=1920&tag=b1 1920w');
    expect(img.getAttribute('sizes')).toBe('(min-width: 768px) 360px, 300px');
  });

  it('sets no srcset or sizes when the card shows a placeholder', () => {
    const img = MediaCard({ item: { Id: 'm2', Type: 'Movie', Name: 'Ohne Bild' } }).querySelector('img.media-card-image');

    expect(img.getAttribute('src').startsWith('data:image/svg+xml')).toBe(true);
    expect(img.hasAttribute('srcset')).toBe(false);
    expect(img.hasAttribute('sizes')).toBe(false);
  });
});
