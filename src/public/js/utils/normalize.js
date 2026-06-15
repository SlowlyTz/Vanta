import { formatTicksToDuration, formatYear } from './format.js';
import { getItemImageUrl } from './image.js';
import { getTmdbImageUrl } from './poster.js';

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

export function normalizeTmdbItem(data, type) {
  const name = data.title || data.name || 'Unbekannt';
  const originalTitle = data.original_title || data.originalTitle || data.original_name || data.originalName || null;
  const hasOriginal = originalTitle && originalTitle !== name;

  const overview = data.overview || 'Keine Beschreibung verfügbar.';
  const genres = Array.isArray(data.genres) ? data.genres.map(g => g.name) : [];

  const dateStr = data.release_date || data.releaseDate || data.first_air_date || data.firstAirDate || '';
  const year = dateStr ? dateStr.substring(0, 4) : null;

  let duration = null;
  if (type === 'movie' && data.runtime) {
    const h = Math.floor(data.runtime / 60);
    const m = data.runtime % 60;
    duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
  } else if (type === 'tv' && (data.number_of_seasons || data.numberOfSeasons)) {
    const seasonCount = data.number_of_seasons || data.numberOfSeasons;
    duration = seasonCount === 1 ? '1 Staffel' : `${seasonCount} Staffeln`;
  }

  const typeLabel = type === 'tv' ? 'Serie' : 'Film';

  const posterUrl = getTmdbImageUrl(data.poster_path || data.posterPath, 'w500');
  const backdropUrl = getTmdbImageUrl(data.backdrop_path || data.backdropPath, 'w1280');

  const tagline = data.tagline || null;

  const directors = [];
  if (type === 'movie' && data.credits && data.credits.crew) {
    data.credits.crew
      .filter(c => c.job === 'Director')
      .forEach(c => directors.push(c.name));
  } else if (type === 'tv' && data.created_by) {
    data.created_by.forEach(c => directors.push(c.name));
  }

  const studios = Array.isArray(data.production_companies)
    ? data.production_companies.map(c => c.name)
    : [];

  const actors = [];
  if (data.credits && data.credits.cast) {
    data.credits.cast.slice(0, 20).forEach(c => {
      actors.push({
        Name: c.name,
        Role: c.character || null,
        profileUrl: getTmdbImageUrl(c.profile_path || c.profilePath, 'w185'),
        Id: null
      });
    });
  }

  const seasons = [];
  if (type === 'tv' && Array.isArray(data.seasons)) {
    data.seasons.forEach(s => {
      const seasonNumber = s.season_number || s.seasonNumber;
      if (seasonNumber > 0) {
        seasons.push({
          name: s.name || `Staffel ${seasonNumber}`,
          seasonNumber,
          episodeCount: s.episode_count || s.episodeCount || 0,
          posterUrl: getTmdbImageUrl(s.poster_path || s.posterPath, 'w300'),
          overview: s.overview || null
        });
      }
    });
  }

  return {
    name,
    type: type === 'tv' ? 'series' : 'movie',
    overview,
    posterUrl,
    backdropUrl,
    genres,
    year,
    duration,
    typeLabel,
    rating: data.vote_average || null,
    criticRating: null,
    fsk: null,
    originalTitle: hasOriginal ? originalTitle : null,
    episodeTitle: null,
    tagline,
    directors,
    studios,
    actors,
    itemId: data.id || null,
    itemType: type,
    tmdbType: type,
    rawItem: data,
    seasons,
    mediaInfo: data.mediaInfo || null
  };
}

function formatEpisodeLabel(item) {
  const parts = [];
  if (item.ParentIndexNumber || item.IndexNumber) {
    const sn = String(item.ParentIndexNumber || 1).padStart(2, '0');
    const en = String(item.IndexNumber || 1).padStart(2, '0');
    parts.push(`S${sn}E${en}`);
  } else if (item.SeasonName) {
    parts.push(item.SeasonName);
  }
  parts.push(item.Name);
  return parts.join(' · ');
}
