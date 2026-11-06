// Builds one group of home page rows by name; unknown groups are a 400.
import { httpError } from '../../../utils/httpError.js';
import { buildIndex } from './cache.js';
import { buildFeaturedSections, buildGenreSections, buildNowPlayingSection, buildPublisherSections, buildTopTenSections } from './loaders.js';
export async function getHomeSectionGroup(userId, accessToken, group) {
  if (group === 'now-playing') {
    const items = await buildIndex(userId, accessToken);
    return [await buildNowPlayingSection(items)];
  }

  if (group === 'genres') {
    const items = await buildIndex(userId, accessToken);
    // The series top 10 opens this group, rows away from the films' one.
    const [topSeries, genres] = await Promise.all([
      buildTopTenSections(items, { types: ['Series'] }),
      buildGenreSections(userId, accessToken, items)
    ]);
    return [...topSeries, ...genres];
  }

  if (group === 'featured') {
    const items = await buildIndex(userId, accessToken);
    return buildFeaturedSections(items);
  }

  if (group === 'publishers') {
    return buildPublisherSections(userId, accessToken);
  }

  throw httpError(400, `Unbekannter Bereich der Startseite: ${group}`);
}
