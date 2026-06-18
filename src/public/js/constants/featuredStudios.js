export const FEATURED_STUDIOS = [
  { match: ['disney', 'walt disney', 'walt disney pictures', 'walt disney studios', 'walt disney animation studios'], label: 'Disney', image: '/assets/publisher/disney.webp' },
  { match: ['20th century', '20th century studios', '20th century fox', 'twentieth century fox'], label: '20th Century Studios', image: '/assets/publisher/20th-century.webp' },
  { match: ['warner bros', 'warner bros pictures', 'warner brothers', 'warner bros.'], label: 'Warner Bros', image: '/assets/publisher/warner-bros.webp' },
  { match: ['netflix'], label: 'Netflix', image: '/assets/publisher/netflix.webp' },
  { match: ['apple tv', 'apple tv+', 'appletv', 'apple'], label: 'Apple TV', image: '/assets/publisher/appletv.webp' },
  { match: ['amazon', 'prime video', 'amazon studios', 'amazon prime', 'amazon mgm studios'], label: 'Prime Video', image: '/assets/publisher/prime.webp' },
  { match: ['hbo', 'hbo max', 'hbo films', 'home box office'], label: 'HBO', image: '/assets/publisher/hbo.webp' }
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
