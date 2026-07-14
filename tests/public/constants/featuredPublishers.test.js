import { describe, it, expect } from 'vitest';
import {
  FEATURED_PUBLISHERS,
  normalizePublisherName,
  matchesPublisherAlias,
  getFeaturedPublisherById,
  matchFeaturedPublisher,
  getFeaturedPublishersFromStudios
} from '../../../src/public/js/constants/featuredPublishers.js';

describe('featuredPublishers', () => {
  it('every publisher has id, label, image and aliases', () => {
    for (const publisher of FEATURED_PUBLISHERS) {
      expect(publisher.id).toBeTruthy();
      expect(publisher.label).toBeTruthy();
      expect(publisher.image).toBeTruthy();
      expect(Array.isArray(publisher.aliases)).toBe(true);
      expect(publisher.aliases.length).toBeGreaterThan(0);
    }
  });

  describe('normalizePublisherName', () => {
    it('lowercases, strips punctuation and collapses whitespace', () => {
      expect(normalizePublisherName('Warner Bros.  Pictures')).toBe('warner bros pictures');
    });

    it('handles null/undefined gracefully', () => {
      expect(normalizePublisherName(null)).toBe('');
      expect(normalizePublisherName(undefined)).toBe('');
    });

    it('replaces & with and', () => {
      expect(normalizePublisherName('Warner & Bros')).toBe('warner and bros');
    });
  });

  describe('matchesPublisherAlias', () => {
    it('matches exact alias', () => {
      expect(matchesPublisherAlias('Netflix', 'netflix')).toBe(true);
    });

    it('matches when studio name extends the alias with a suffix word', () => {
      expect(matchesPublisherAlias('Warner Bros Television', 'warner bros')).toBe(true);
    });

    it('does not match unrelated substrings', () => {
      expect(matchesPublisherAlias('Applesauce Studios', 'apple')).toBe(false);
    });
  });

  describe('matchFeaturedPublisher', () => {
    it('matches Warner Bros. Pictures to warner-bros', () => {
      expect(matchFeaturedPublisher('Warner Bros. Pictures')?.id).toBe('warner-bros');
    });

    it('matches Warner Bros. Animation to warner-bros', () => {
      expect(matchFeaturedPublisher('Warner Bros. Animation')?.id).toBe('warner-bros');
    });

    it('matches Apple TV+ to apple-tv without over-matching plain "apple" strings', () => {
      expect(matchFeaturedPublisher('Apple TV+')?.id).toBe('apple-tv');
      expect(matchFeaturedPublisher('Applesauce Studios')).toBeNull();
      expect(matchFeaturedPublisher('Apple Corps Ltd')).toBeNull();
    });

    it('does not match subsidiaries that are not pure spelling variants', () => {
      expect(matchFeaturedPublisher('Pixar')).toBeNull();
      expect(matchFeaturedPublisher('Marvel Studios')).toBeNull();
      expect(matchFeaturedPublisher('Lucasfilm')).toBeNull();
      expect(matchFeaturedPublisher('New Line Cinema')).toBeNull();
      expect(matchFeaturedPublisher('DC Studios')).toBeNull();
      expect(matchFeaturedPublisher('MGM')).toBeNull();
    });

    it('returns null for unmatched studios', () => {
      expect(matchFeaturedPublisher('Some Indie Studio')).toBeNull();
    });
  });

  describe('getFeaturedPublisherById', () => {
    it('finds a publisher by id', () => {
      expect(getFeaturedPublisherById('warner-bros')?.label).toBe('Warner Bros');
    });

    it('returns null for unknown id', () => {
      expect(getFeaturedPublisherById('unknown-id')).toBeNull();
    });
  });

  describe('getFeaturedPublishersFromStudios', () => {
    it('collects all matching Jellyfin studio names per publisher group', () => {
      const studios = [
        { Name: 'Warner Bros. Pictures' },
        { Name: 'Warner Bros. Animation' },
        { Name: 'Some Indie Studio' },
        { Name: 'Netflix' }
      ];

      const result = getFeaturedPublishersFromStudios(studios);
      const warner = result.find(p => p.id === 'warner-bros');
      const netflix = result.find(p => p.id === 'netflix');

      expect(warner.studioNames).toEqual(['Warner Bros. Pictures', 'Warner Bros. Animation']);
      expect(netflix.studioNames).toEqual(['Netflix']);
      expect(result.find(p => p.id === 'disney')).toBeUndefined();
    });

    it('preserves FEATURED_PUBLISHERS order', () => {
      const studios = [
        { Name: 'HBO' },
        { Name: 'Netflix' },
        { Name: 'Disney' }
      ];

      const result = getFeaturedPublishersFromStudios(studios);
      expect(result.map(p => p.id)).toEqual(['disney', 'netflix', 'hbo']);
    });

    it('returns an empty array when no studios match', () => {
      expect(getFeaturedPublishersFromStudios([{ Name: 'Some Indie Studio' }])).toEqual([]);
    });

    it('handles an empty or missing input', () => {
      expect(getFeaturedPublishersFromStudios([])).toEqual([]);
      expect(getFeaturedPublishersFromStudios(undefined)).toEqual([]);
    });
  });
});
