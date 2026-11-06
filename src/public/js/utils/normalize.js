// Turns a Jellyfin item into the flat, display-ready shape the detail view
// renders.
import { formatTicksToDuration, formatYear } from './format.js';
import { getItemImageUrl } from './image.js';
import { formatEpisodeCode } from '../shared/episodeCode.js';
import { MediaApi } from '../api/media.api.js';

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

  const people = Array.isArray(item.People) ? item.People : [];
  const directors = people.filter(p => p.Type === 'Director').map(p => p.Name);
  // Who made it, for the crew row: direction first, then the script; one
  // card per person ("Regie & Buch").
  const crewById = new Map();
  [['Director', 'Regie'], ['Writer', 'Drehbuch']].forEach(([type, job]) => {
    people.filter(p => p.Type === type).forEach(person => {
      const key = person.Id || person.Name;
      const known = crewById.get(key);
      if (!known) crewById.set(key, { ...person, job });
      else if (!known.job.includes(job)) known.job = 'Regie & Buch';
    });
  });
  const crew = [...crewById.values()];

  const studios = item.Studios
    ? item.Studios.map(s => typeof s === 'string' ? s : (s.Name || s))
    : [];

  const tagline = item.Taglines && item.Taglines.length > 0
    ? item.Taglines[0]
    : null;

  const actors = people.filter(p => p.Type === 'Actor');

  return {
    name,
    type: item.Type === 'Series' ? 'series' : 'movie',
    overview: item.Overview || 'Keine Beschreibung verfügbar.',
    posterUrl: getItemImageUrl(item, 'Primary'),
    backdropUrl: getItemImageUrl(item, 'Backdrop'),
    logoUrl: item.ImageTags?.Logo && item.Id ? MediaApi.getImageUrl(item.Id, 'Logo', 800, { tag: item.ImageTags.Logo }) : null,
    media: item.VantaMedia || null,
    runtimeTicks: Number(item.RunTimeTicks) || null,
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
    crew,
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
