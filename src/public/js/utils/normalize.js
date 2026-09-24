import { formatTicksToDuration, formatYear } from './format.js';
import { getItemImageUrl } from './image.js';
import { formatEpisodeCode } from '../shared/episodeCode.js';

export function normalizeJellyfinItem(item) {
  const isEpisode = item.Type === 'Episode';
  const name = isEpisode && item.SeriesName ? item.SeriesName : item.Name;
  const originalTitle = item.OriginalTitle && item.OriginalTitle !== item.Name
    ? item.OriginalTitle
    : null;

  const episodeTitle = isEpisode
    ? formatEpisodeLabel(item)
    : null;

  const duration = item.RunTimeTicks
    ? formatTicksToDuration(item.RunTimeTicks)
    : null;

  const typeLabelMap = {
    Movie: 'Film',
    Series: 'Serie',
    Season: 'Staffel',
    Episode: 'Episode'
  };

  const typeLabel = item.Type ? (typeLabelMap[item.Type] || item.Type) : null;

  const genreList = Array.isArray(item.Genres) ? item.Genres : [];

  const directors = item.People
    ? item.People.filter(p => p.Type === 'Director').map(p => p.Name)
    : [];

  const studios = item.Studios
    ? item.Studios.map(s => typeof s === 'string' ? s : (s.Name || s))
    : [];

  const tagline = item.Taglines && item.Taglines.length > 0
    ? item.Taglines[0]
    : null;

  const actors = item.People
    ? item.People.filter(p => p.Type === 'Actor')
    : [];

  return {
    name,
    type: item.Type === 'Series' ? 'series' : 'movie',
    overview: item.Overview || 'Keine Beschreibung verfügbar.',
    posterUrl: getItemImageUrl(item, 'Primary'),
    backdropUrl: getItemImageUrl(item, 'Backdrop'),
    genres: genreList,
    year: formatYear(item.PremiereDate || item.ProductionYear) || null,
    duration,
    typeLabel,
    rating: item.CommunityRating || null,
    criticRating: item.CriticRating || null,
    fsk: item.OfficialRating || null,
    originalTitle,
    episodeTitle,
    tagline,
    directors,
    studios,
    actors,
    itemId: item.Id || null,
    itemType: item.Type || null,
    rawItem: item
  };
}

function formatEpisodeLabel(item) {
  const parts = [];
  if (item.ParentIndexNumber || item.IndexNumber) {
    parts.push(formatEpisodeCode(item));
  } else if (item.SeasonName) {
    parts.push(item.SeasonName);
  }
  parts.push(item.Name);
  return parts.join(' · ');
}
