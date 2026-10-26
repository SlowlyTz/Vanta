// Name, year and sort helpers for matching and ordering home page rows.
export function normalizeGenre(name) {
  return name
    .toLowerCase()
    .replace(/[\s\-_.]+/g, ' ')
    .trim();
}

export function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[\s\-_.!?,:;]+/g, ' ')
    .trim();
}

export function getItemYear(item) {
  const date = item.PremiereDate || item.ProductionYear || item.DateCreated;
  if (!date) return null;
  const year = String(date).slice(0, 4);
  return /^\d{4}$/.test(year) ? parseInt(year, 10) : null;
}

export { shuffle as shuffleArray } from '../../../utils/shuffle.js';

export function sortByNewest(items) {
  return [...items].sort((a, b) => {
    const yearA = getItemYear(a) || 0;
    const yearB = getItemYear(b) || 0;
    if (yearB !== yearA) return yearB - yearA;
    return (a.SortName || a.Name || '').localeCompare(b.SortName || b.Name || '');
  });
}

export function buildGenreHref(genre) {
  if (genre.movieName && genre.seriesName) {
    return `#/genre/Movie,Series/${encodeURIComponent(genre.label)}`;
  }

  if (genre.seriesName) {
    return `#/genre/Series/${encodeURIComponent(genre.seriesName)}`;
  }

  return `#/genre/Movie/${encodeURIComponent(genre.movieName || genre.label)}`;
}
