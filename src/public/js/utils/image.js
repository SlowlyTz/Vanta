import { MediaApi } from '../api/media.api.js';

export function getItemImageUrl(item, type = 'Primary') {
  if (!item) return '';

  const posterWidth = 400;
  const backdropWidth = 1280;
  const getTag = (imageItem, imageType) => {
    if (!imageItem) return null;
    if (imageType === 'Backdrop') return imageItem.BackdropImageTags?.[0] || null;
    return imageItem.ImageTags?.[imageType] || null;
  };
  const imageUrl = (id, imageType, width, tag = null) => {
    return MediaApi.getImageUrl(id, imageType, width, tag ? { tag } : {});
  };

  // 1. Direct tag checks
  if (type === 'Primary') {
    if (item.Type === 'Episode' && item.SeriesPrimaryImageTag && item.SeriesId) {
      return imageUrl(item.SeriesId, 'Primary', posterWidth, item.SeriesPrimaryImageTag);
    }
    if (item.ImageTags && item.ImageTags.Primary) {
      return imageUrl(item.Id, 'Primary', posterWidth, getTag(item, 'Primary'));
    }
    if (item.SeriesPrimaryImageTag && item.SeriesId) {
      return imageUrl(item.SeriesId, 'Primary', posterWidth, item.SeriesPrimaryImageTag);
    }
    if (item.AlbumPrimaryImageTag && item.AlbumId) {
      return imageUrl(item.AlbumId, 'Primary', posterWidth, item.AlbumPrimaryImageTag);
    }
  }

  if (type === 'Backdrop') {
    if (item.BackdropImageTags && item.BackdropImageTags.length > 0) {
      return imageUrl(item.Id, 'Backdrop', backdropWidth, getTag(item, 'Backdrop'));
    }
    if (item.ParentBackdropImageTags && item.ParentBackdropImageTags.length > 0 && item.ParentBackdropItemId) {
      return imageUrl(item.ParentBackdropItemId, 'Backdrop', backdropWidth, item.ParentBackdropImageTags[0]);
    }
    // Try Series Backdrop if it is an episode/season
    if (item.SeriesId) {
      return imageUrl(item.SeriesId, 'Backdrop', backdropWidth);
    }
  }

  // Check generic types
  if (item.ImageTags && item.ImageTags[type]) {
    const width = type === 'Backdrop' ? backdropWidth : posterWidth;
    return imageUrl(item.Id, type, width, getTag(item, type));
  }

  // 2. Generic fallbacks (e.g. Episode without poster gets Series poster or Episode backdrop)
  if (type === 'Primary') {
    // Try Series Primary
    if (item.SeriesId) {
      return imageUrl(item.SeriesId, 'Primary', posterWidth, item.SeriesPrimaryImageTag);
    }
    // Try Parent ID
    if (item.ParentId) {
      return imageUrl(item.ParentId, 'Primary', posterWidth);
    }
  }

  if (type === 'Backdrop') {
    // Try Primary
    if (item.ImageTags && item.ImageTags.Primary) {
      return imageUrl(item.Id, 'Primary', backdropWidth, getTag(item, 'Primary'));
    }
    // Try Parent Backdrop
    if (item.ParentBackdropItemId) {
      return imageUrl(item.ParentBackdropItemId, 'Backdrop', backdropWidth, item.ParentBackdropImageTags?.[0]);
    }
  }

  // 3. SVG dynamic placeholder
  return createPlaceholderSvg(item.Name || 'Medien', type);
}

export function getPersonImageUrl(person, width = 160) {
  if (!person) return createPersonPlaceholderSvg();

  const imageTag = person.PrimaryImageTag || person.ImageTags?.Primary;
  if (person.Id && imageTag) {
    return MediaApi.getImageUrl(person.Id, 'Primary', width, { tag: imageTag });
  }

  return createPersonPlaceholderSvg(person.Name || '');
}

export function createPersonPlaceholderSvg(name = '') {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('');

  const label = initials || '?';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <defs>
        <linearGradient id="person-bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="hsl(240, 8%, 18%)"/>
          <stop offset="100%" stop-color="hsl(240, 10%, 9%)"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" fill="url(%23person-bg)"/>
      <circle cx="80" cy="62" r="26" fill="hsl(240, 5%, 52%)" opacity="0.72"/>
      <path d="M34 138c7-30 25-46 46-46s39 16 46 46" fill="hsl(240, 5%, 52%)" opacity="0.72"/>
      <text x="80" y="88" dominant-baseline="middle" text-anchor="middle" font-family="'Outfit', -apple-system, sans-serif" font-size="26" font-weight="700" fill="hsl(0, 0%, 96%)" opacity="0.36">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${svg.trim().replace(/[\n\r]/g, '').replace(/"/g, "'").replace(/#/g, '%23')}`;
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
