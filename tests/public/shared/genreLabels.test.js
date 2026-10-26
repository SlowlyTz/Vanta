import { describe, it, expect } from 'vitest';
import { genreLabel } from '../../../src/public/js/shared/genreLabels.js';

describe('genreLabel', () => {
  it('names the English TMDB series genres in German and keeps the rest', () => {
    expect(genreLabel('War & Politics')).toBe('Krieg & Politik');
    expect(genreLabel('Sci-Fi & Fantasy')).toBe('Science-Fiction & Fantasy');
    expect(genreLabel('Drama')).toBe('Drama');
  });
});
