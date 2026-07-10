export const FEATURED_PUBLISHERS = [
  {
    id: 'disney',
    label: 'Disney',
    image: '/assets/publisher/disney.webp',
    aliases: [
      'disney',
      'walt disney',
      'walt disney pictures',
      'walt disney studios',
      'walt disney animation studios',
      'disney television animation'
    ]
  },
  {
    id: '20th-century',
    label: '20th Century Studios',
    image: '/assets/publisher/20th-century.webp',
    aliases: [
      '20th century',
      '20th century studios',
      '20th century fox',
      'twentieth century fox'
    ]
  },
  {
    id: 'warner-bros',
    label: 'Warner Bros',
    image: '/assets/publisher/warner-bros.webp',
    aliases: [
      'warner bros',
      'warner bros.',
      'warner brothers',
      'warner bros pictures',
      'warner bros. pictures',
      'warner bros entertainment',
      'warner bros. entertainment',
      'warner bros animation',
      'warner bros. animation',
      'warner animation group',
      'warner bros television',
      'warner bros. television'
    ]
  },
  {
    id: 'netflix',
    label: 'Netflix',
    image: '/assets/publisher/netflix.webp',
    aliases: [
      'netflix',
      'netflix studios',
      'netflix animation'
    ]
  },
  {
    id: 'apple-tv',
    label: 'Apple TV',
    image: '/assets/publisher/appletv.webp',
    aliases: [
      'apple tv',
      'apple tv+',
      'appletv',
      'apple studios',
      'apple original films'
    ]
  },
  {
    id: 'prime-video',
    label: 'Prime Video',
    image: '/assets/publisher/prime.webp',
    aliases: [
      'prime video',
      'amazon',
      'amazon studios',
      'amazon prime',
      'amazon mgm studios',
      'mgm amazon studios'
    ]
  },
  {
    id: 'hbo',
    label: 'HBO',
    image: '/assets/publisher/hbo.webp',
    aliases: [
      'hbo',
      'hbo max',
      'max',
      'hbo films',
      'home box office'
    ]
  }
];

export function normalizePublisherName(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function matchesPublisherAlias(studioName, alias) {
  const studio = normalizePublisherName(studioName);
  const normalizedAlias = normalizePublisherName(alias);
  return studio === normalizedAlias || studio.startsWith(`${normalizedAlias} `);
}

export function getFeaturedPublisherById(id) {
  return FEATURED_PUBLISHERS.find(publisher => publisher.id === id) || null;
}

export function matchFeaturedPublisher(studioName) {
  for (const publisher of FEATURED_PUBLISHERS) {
    if (publisher.aliases.some(alias => matchesPublisherAlias(studioName, alias))) {
      return publisher;
    }
  }
  return null;
}

export function getFeaturedPublishersFromStudios(studios) {
  const groups = new Map();

  for (const studio of studios || []) {
    const publisher = matchFeaturedPublisher(studio.Name);
    if (!publisher) continue;

    if (!groups.has(publisher.id)) {
      groups.set(publisher.id, {
        ...publisher,
        studioNames: []
      });
    }

    groups.get(publisher.id).studioNames.push(studio.Name);
  }

  return FEATURED_PUBLISHERS
    .map(publisher => groups.get(publisher.id))
    .filter(Boolean);
}
