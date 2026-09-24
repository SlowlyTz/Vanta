import { episodeHeadingCode } from '../shared/episodeCode.js';

// Title and subtitle for the player's top bar: a series episode shows the
// series as the title and "S1 · F3 · Episode name" below it.
export function playerHeading(item) {
  if (!item) return { title: '', subtitle: '' };
  if (item.Type === 'Episode' && item.SeriesName) {
    const code = episodeHeadingCode(item.ParentIndexNumber, item.IndexNumber);
    return { title: item.SeriesName, subtitle: [code, item.Name].filter(Boolean).join(' · ') };
  }
  return { title: item.Name || item.SeriesName || '', subtitle: '' };
}
