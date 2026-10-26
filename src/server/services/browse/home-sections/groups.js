// Builds one group of home page rows by name; unknown groups are a 400.
import { httpError } from '../../../utils/httpError.js';
import { buildIndex } from './cache.js';
import { buildFeaturedSections, buildGenreSections, buildNowPlayingSection, buildPublisherSections } from './loaders.js';
export async function getHomeSectionGroup(userId, accessToken, group) {
  if (group === 'now-playing') {
    const items = await buildIndex(userId, accessToken);
    return [await buildNowPlayingSection(items)];
  }

  if (group === 'genres') {
    const items = await buildIndex(userId, accessToken);
    return buildGenreSections(userId, accessToken, items);
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
