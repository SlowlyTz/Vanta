export const FEATURED_STUDIOS = [
  { match: ['disney', 'walt disney', 'walt disney pictures', 'walt disney studios', 'walt disney animation studios'], label: 'Disney' },
  { match: ['20th century', '20th century studios', '20th century fox', 'twentieth century fox'], label: '20th Century Studios' },
  { match: ['warner bros', 'warner bros pictures', 'warner brothers', 'warner bros.'], label: 'Warner Bros' },
  { match: ['netflix'], label: 'Netflix' },
  { match: ['apple tv', 'apple tv+', 'appletv', 'apple'], label: 'Apple TV' },
  { match: ['amazon', 'prime video', 'amazon studios', 'amazon prime', 'amazon mgm studios'], label: 'Prime Video' },
  { match: ['hbo', 'hbo max', 'hbo films', 'home box office'], label: 'HBO' }
];

export function matchFeaturedStudio(studioName) {
  const lower = studioName.toLowerCase();
  for (const entry of FEATURED_STUDIOS) {
    if (entry.match.some(pattern => lower === pattern || lower.startsWith(pattern))) {
      return entry;
    }
  }
  return null;
}

export function getFeaturedStudiosFromLibraryStudios(studios) {
  const featured = [];
  const seen = new Set();

  for (const studio of studios) {
    const match = matchFeaturedStudio(studio.Name);
    if (match && !seen.has(match.label)) {
      seen.add(match.label);
      featured.push({
        ...studio,
        displayLabel: match.label,
        order: FEATURED_STUDIOS.indexOf(match)
      });
    }
  }

  featured.sort((a, b) => a.order - b.order);
  return featured;
}
