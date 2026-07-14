import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeRouteKey,
  saveRouteState,
  getRouteState,
  clearRouteState,
  markReturnFromDetail,
  consumeReturnMarker
} from '../../../src/public/js/utils/routeState.js';

describe('routeState', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.location.hash = '#/movies';
  });

  it('normalizes a hash by stripping the query string', () => {
    expect(normalizeRouteKey('#/movies?foo=bar')).toBe('#/movies');
    expect(normalizeRouteKey('#/genre/Movie/Action')).toBe('#/genre/Movie/Action');
    expect(normalizeRouteKey('')).toBe('#/home');
  });

  it('saves and reads per-route state', () => {
    saveRouteState('#/movies', { page: 3, limit: 50 });
    expect(getRouteState('#/movies')).toEqual({ page: 3, limit: 50 });
    expect(getRouteState('#/series')).toBeNull();
  });

  it('clears per-route state', () => {
    saveRouteState('#/movies', { page: 3, limit: 50 });
    clearRouteState('#/movies');
    expect(getRouteState('#/movies')).toBeNull();
  });

  it('consumes a return marker only when the route matches', () => {
    window.location.hash = '#/movies';
    markReturnFromDetail({ scrollY: 820, itemId: 'abc' });

    expect(consumeReturnMarker('#/series')).toBeNull();
    // mismatched consume already removed the marker
    expect(consumeReturnMarker('#/movies')).toBeNull();
  });

  it('returns marker data for a matching route and consumes it once', () => {
    window.location.hash = '#/movies';
    markReturnFromDetail({ scrollY: 820, itemId: 'abc', sourceType: 'library' });

    const marker = consumeReturnMarker('#/movies');
    expect(marker).toEqual({
      fromRoute: '#/movies',
      scrollY: 820,
      itemId: 'abc',
      sourceType: 'library'
    });

    expect(consumeReturnMarker('#/movies')).toBeNull();
  });

  it('falls back to window.scrollY when scrollY is not provided', () => {
    Object.defineProperty(window, 'scrollY', { value: 240, configurable: true });
    markReturnFromDetail({ itemId: 'xyz' });

    const marker = consumeReturnMarker('#/movies');
    expect(marker.scrollY).toBe(240);
  });
});
