// Small inline icons for metadata pills (year, runtime, age rating, ratings,
// type). SVG instead of emoji so every platform renders the same glyphs.
const svg = (paths, extra = '') =>
  `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${paths}</svg>`;

export const META_ICONS = {
  year: svg('<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18M8 3v4M16 3v4"></path>'),
  runtime: svg('<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>'),
  age: svg('<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"></path>'),
  star: svg('<path d="M12 3.5l2.6 5.5 6 .7-4.4 4.1 1.2 5.9L12 16.8l-5.4 2.9 1.2-5.9L3.4 9.7l6-.7z" fill="currentColor" stroke="none"></path>'),
  critic: svg('<path d="M12 21c-4.4 0-8-3.1-8-7.5S7.6 7 12 7s8 2.1 8 6.5S16.4 21 12 21z" fill="currentColor" stroke="none"></path><path d="M12 7c0-2 1.5-3.5 3.5-4M12 7c-1.5-1-3.5-1.3-5-.6M12 7c1.5-1 3.5-1.3 5-.6"></path>'),
  movie: svg('<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"></path>'),
  series: svg('<rect x="3" y="5" width="18" height="12" rx="2"></rect><path d="M8 21h8M12 17v4"></path>'),
  episode: svg('<rect x="3" y="5" width="18" height="12" rx="2"></rect><path d="M10 9l4 2.5-4 2.5z" fill="currentColor" stroke="none"></path>')
};

export function createMetaIcon(name) {
  const markup = META_ICONS[name];
  if (!markup) return null;
  const span = document.createElement('span');
  span.className = 'meta-icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = markup;
  return span;
}

export function metaIconFor(typeLabel) {
  switch (typeLabel) {
    case 'Film': return 'movie';
    case 'Serie': return 'series';
    case 'Episode': case 'Folge': return 'episode';
    default: return null;
  }
}
