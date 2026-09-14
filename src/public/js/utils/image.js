import { MediaApi } from '../api/media.api.js';

const POSTER_WIDTH = 400;
const BACKDROP_WIDTH = 1280;

// Candidate widths the server caches; the browser picks one via srcset.
const POSTER_WIDTHS = [200, 400, 800];
const BACKDROP_WIDTHS = [800, 1280, 1920];

// Rendered card widths from the CSS, so the browser never loads more than a
// card of that width (times its pixel ratio) can show.
const SIZES = {
  poster: '(min-width: 1200px) 220px, (min-width: 768px) 180px, 160px',
  landscape: '(min-width: 768px) 360px, 300px',
  hero: '100vw'
};

const getTag = (imageItem, imageType) => {
  if (!imageItem) return null;
  if (imageType === 'Backdrop') return imageItem.BackdropImageTags?.[0] || null;
  return imageItem.ImageTags?.[imageType] || null;
};

const imageUrl = (id, imageType, width, tag = null) => {
  return MediaApi.getImageUrl(id, imageType, width, tag ? { tag } : {});
};

// Which item, image type and tag a card should show, plus whether it is laid
// out wide (backdrop widths) or as a poster. Null means no image at all.
function resolveImageSource(item, type) {
  const source = (id, imageType, wide, tag = null) => ({ id, imageType, wide, tag });

  // 1. Direct tag checks
  if (type === 'Primary') {
    if (item.Type === 'Episode' && item.SeriesPrimaryImageTag && item.SeriesId) {
      return source(item.SeriesId, 'Primary', false, item.SeriesPrimaryImageTag);
    }
    if (item.ImageTags && item.ImageTags.Primary) {
      return source(item.Id, 'Primary', false, getTag(item, 'Primary'));
    }
    if (item.SeriesPrimaryImageTag && item.SeriesId) {
      return source(item.SeriesId, 'Primary', false, item.SeriesPrimaryImageTag);
    }
    if (item.AlbumPrimaryImageTag && item.AlbumId) {
      return source(item.AlbumId, 'Primary', false, item.AlbumPrimaryImageTag);
    }
  }

  if (type === 'Backdrop') {
    if (item.BackdropImageTags && item.BackdropImageTags.length > 0) {
      return source(item.Id, 'Backdrop', true, getTag(item, 'Backdrop'));
    }
    if (item.ParentBackdropImageTags && item.ParentBackdropImageTags.length > 0 && item.ParentBackdropItemId) {
      return source(item.ParentBackdropItemId, 'Backdrop', true, item.ParentBackdropImageTags[0]);
    }
    // Try Series Backdrop if it is an episode/season
    if (item.SeriesId) {
      return source(item.SeriesId, 'Backdrop', true);
    }
  }

  // Check generic types
  if (item.ImageTags && item.ImageTags[type]) {
    return source(item.Id, type, type === 'Backdrop', getTag(item, type));
  }

  // 2. Generic fallbacks (e.g. Episode without poster gets Series poster or Episode backdrop)
  if (type === 'Primary') {
    // Try Series Primary
    if (item.SeriesId) {
      return source(item.SeriesId, 'Primary', false, item.SeriesPrimaryImageTag);
    }
    // Try Parent ID
    if (item.ParentId) {
      return source(item.ParentId, 'Primary', false);
    }
  }

  if (type === 'Backdrop') {
    // Try Primary
    if (item.ImageTags && item.ImageTags.Primary) {
      return source(item.Id, 'Primary', true, getTag(item, 'Primary'));
    }
    // Try Parent Backdrop
    if (item.ParentBackdropItemId) {
      return source(item.ParentBackdropItemId, 'Backdrop', true, item.ParentBackdropImageTags?.[0]);
    }
  }

  return null;
}

export function getItemImageUrl(item, type = 'Primary') {
  if (!item) return '';

  const source = resolveImageSource(item, type);
  if (!source) {
    // 3. SVG dynamic placeholder
    return createPlaceholderSvg(item.Name || 'Medien', type);
  }

  return imageUrl(source.id, source.imageType, source.wide ? BACKDROP_WIDTH : POSTER_WIDTH, source.tag);
}

// `src` is exactly what getItemImageUrl returns; `srcset`/`sizes` let the
// browser pick a smaller or larger cached rendition for the given card layout.
// Placeholders have no srcset.
export function getItemImageSources(item, type = 'Primary', layout = 'poster') {
  const src = getItemImageUrl(item, type);
  const source = item ? resolveImageSource(item, type) : null;
  if (!source) return { src, srcset: null, sizes: null };

  const widths = source.imageType === 'Backdrop' ? BACKDROP_WIDTHS : POSTER_WIDTHS;
  const srcset = widths.map(width => `${imageUrl(source.id, source.imageType, width, source.tag)} ${width}w`).join(', ');
  return { src, srcset, sizes: SIZES[layout] || SIZES.poster };
}

// Cast members without a photo get the same neutral portrait everywhere.
export const PERSON_PLACEHOLDER_URL = '/assets/person-placeholder.webp';

export function getPersonImageUrl(person, width = 160) {
  if (!person) return PERSON_PLACEHOLDER_URL;

  const imageTag = person.PrimaryImageTag || person.ImageTags?.Primary;
  if (person.Id && imageTag) {
    return `${MediaApi.getImageUrl(person.Id, 'Primary', width, { tag: imageTag })}&fallback=person`;
  }

  return PERSON_PLACEHOLDER_URL;
}

function createPlaceholderSvg(title, type) {
  const width = type === 'Backdrop' ? 320 : 200;
  const height = type === 'Backdrop' ? 180 : 300;
  const shortTitle = title.length > 25 ? title.substring(0, 22) + '...' : title;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="hsl(240, 10%, 10%)"/>
      <circle cx="${width / 2}" cy="${height / 2 - 20}" r="24" fill="hsl(240, 10%, 18%)" />
      <path d="M${width / 2 - 8} ${height / 2 - 28} L${width / 2 + 12} ${height / 2 - 20} L${width / 2 - 8} ${height / 2 - 12} Z" fill="hsl(240, 5%, 65%)"/>
      <text x="50%" y="${height / 2 + 30}" dominant-baseline="middle" text-anchor="middle" font-family="'Outfit', sans-serif" font-weight="500" font-size="12" fill="hsl(240, 5%, 65%)">${shortTitle}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${svg.trim().replace(/[\n\r]/g, '').replace(/"/g, "'").replace(/#/g, '%23')}`;
}
