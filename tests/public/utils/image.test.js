import { describe, it, expect } from 'vitest';
import { getItemImageUrl, getItemImageSources } from '../../../src/public/js/utils/image.js';

const movie = { Id: 'm1', Name: 'Inception', Type: 'Movie', ImageTags: { Primary: 'p1', Logo: 'l1' }, BackdropImageTags: ['b1'] };

describe('getItemImageUrl', () => {
  it('builds poster URLs at 400 and backdrop URLs at 1280', () => {
    expect(getItemImageUrl(movie, 'Primary')).toBe('/api/media/image/m1?type=Primary&maxWidth=400&tag=p1');
    expect(getItemImageUrl(movie, 'Backdrop')).toBe('/api/media/image/m1?type=Backdrop&maxWidth=1280&tag=b1');
    expect(getItemImageUrl(movie, 'Logo')).toBe('/api/media/image/m1?type=Logo&maxWidth=400&tag=l1');
  });

  it('falls back through series, parent and primary images like before', () => {
    const episode = { Id: 'e1', Name: 'Pilot', Type: 'Episode', SeriesId: 's1', SeriesPrimaryImageTag: 'sp' };
    expect(getItemImageUrl(episode, 'Primary')).toBe('/api/media/image/s1?type=Primary&maxWidth=400&tag=sp');
    expect(getItemImageUrl(episode, 'Backdrop')).toBe('/api/media/image/s1?type=Backdrop&maxWidth=1280');

    const posterOnly = { Id: 'm2', Name: 'X', Type: 'Movie', ImageTags: { Primary: 'p2' } };
    expect(getItemImageUrl(posterOnly, 'Backdrop')).toBe('/api/media/image/m2?type=Primary&maxWidth=1280&tag=p2');

    const parent = { Id: 'e2', Name: 'Y', Type: 'Episode', ParentId: 'sea1' };
    expect(getItemImageUrl(parent, 'Primary')).toBe('/api/media/image/sea1?type=Primary&maxWidth=400');
  });

  it('returns an SVG placeholder with the title when there is no image, and an empty string for no item', () => {
    const url = getItemImageUrl({ Id: 'n', Name: 'Ohne Bild', Type: 'Movie' }, 'Primary');
    expect(url.startsWith('data:image/svg+xml;utf8,')).toBe(true);
    expect(url).toContain('Ohne Bild');
    expect(getItemImageUrl(null)).toBe('');
  });
});

describe('getItemImageSources', () => {
  it('keeps src identical to getItemImageUrl and adds the poster srcset and sizes', () => {
    const sources = getItemImageSources(movie, 'Primary', 'poster');

    expect(sources.src).toBe(getItemImageUrl(movie, 'Primary'));
    expect(sources.srcset).toBe([
      '/api/media/image/m1?type=Primary&maxWidth=200&tag=p1 200w',
      '/api/media/image/m1?type=Primary&maxWidth=400&tag=p1 400w',
      '/api/media/image/m1?type=Primary&maxWidth=800&tag=p1 800w'
    ].join(', '));
    expect(sources.sizes).toBe('(min-width: 1200px) 220px, (min-width: 768px) 180px, 160px');
  });

  it('uses backdrop widths and landscape sizes for backdrops', () => {
    const sources = getItemImageSources(movie, 'Backdrop', 'landscape');

    expect(sources.src).toBe('/api/media/image/m1?type=Backdrop&maxWidth=1280&tag=b1');
    expect(sources.srcset).toBe([
      '/api/media/image/m1?type=Backdrop&maxWidth=800&tag=b1 800w',
      '/api/media/image/m1?type=Backdrop&maxWidth=1280&tag=b1 1280w',
      '/api/media/image/m1?type=Backdrop&maxWidth=1920&tag=b1 1920w'
    ].join(', '));
    expect(sources.sizes).toBe('(min-width: 768px) 360px, 300px');
  });

  it('uses poster widths when a landscape card falls back to the primary image', () => {
    const posterOnly = { Id: 'm2', Name: 'X', Type: 'Movie', ImageTags: { Primary: 'p2' } };
    const sources = getItemImageSources(posterOnly, 'Backdrop', 'landscape');

    expect(sources.src).toBe('/api/media/image/m2?type=Primary&maxWidth=1280&tag=p2');
    expect(sources.srcset).toContain('maxWidth=800&tag=p2 800w');
    expect(sources.srcset).not.toContain('1920w');
    expect(sources.sizes).toBe('(min-width: 768px) 360px, 300px');
  });

  it('offers the hero layout and defaults unknown layouts to poster sizes', () => {
    expect(getItemImageSources(movie, 'Backdrop', 'hero').sizes).toBe('100vw');
    expect(getItemImageSources(movie, 'Primary', 'unknown').sizes).toBe('(min-width: 1200px) 220px, (min-width: 768px) 180px, 160px');
    expect(getItemImageSources(movie).sizes).toBe('(min-width: 1200px) 220px, (min-width: 768px) 180px, 160px');
  });

  it('has no srcset or sizes for placeholders and missing items', () => {
    const placeholder = getItemImageSources({ Id: 'n', Name: 'Ohne Bild', Type: 'Movie' }, 'Primary');
    expect(placeholder.src.startsWith('data:image/svg+xml')).toBe(true);
    expect(placeholder.srcset).toBeNull();
    expect(placeholder.sizes).toBeNull();

    expect(getItemImageSources(null)).toEqual({ src: '', srcset: null, sizes: null });
  });
});
