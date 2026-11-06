// Detail page rows that load after the hero: the film series a film belongs
// to, and its trailers and extras.
import { createElement } from '../../utils/dom.js';
import { MediaApi } from '../../api/media.api.js';
import { MediaCard } from '../../components/mediaCard.js';
import { HorizontalCarousel } from '../../components/horizontalCarousel.js';
import { extractYouTubeVideoId, openTrailerModal } from '../../components/trailerModal.js';
import { formatTicksToDuration } from '../../utils/format.js';

const PLAY_ICON = '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>';

const playMark = () => {
  const mark = createElement('span', { className: 'extra-card-play' });
  mark.innerHTML = PLAY_ICON;
  return mark;
};

// "Harry Potter Filmreihe": the films of the series the library holds, in
// release order, the current one marked.
export async function loadCollectionSection(item, { signal } = {}) {
  if (item.Type !== 'Movie') return null;
  const { collection } = await MediaApi.getCollection(item.Id, { signal }).catch(() => ({ collection: null }));
  if (!collection?.items?.length) return null;

  const cards = collection.items.map((entry, index) => {
    const current = entry.Id === item.Id;
    return createElement('div', { className: `collection-item${current ? ' is-current' : ''}` },
      createElement('span', { className: 'collection-step' }, current ? 'Dieser Film' : `Teil ${index + 1}`),
      MediaCard({ item: entry })
    );
  });
  const section = HorizontalCarousel({
    title: collection.name,
    items: cards,
    trackClass: 'media-carousel collection-carousel',
    containerClass: 'media-carousel-container detail-collection'
  });
  if (section && collection.missing > 0) {
    section.querySelector('.carousel-header')?.appendChild(
      createElement('span', { className: 'detail-collection-missing' },
        collection.missing === 1 ? '1 Teil fehlt in der Bibliothek' : `${collection.missing} Teile fehlen in der Bibliothek`)
    );
  }
  return section;
}

function youtubeCard({ videoId, name, title }) {
  return createElement('button', {
    type: 'button',
    className: 'extra-card',
    dataset: { tvKey: `extra-yt-${videoId}` },
    onClick: () => openTrailerModal({ title: `${title} ${name}`, videoId })
  },
  createElement('span', { className: 'extra-card-thumb' },
    createElement('img', { src: `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`, alt: '', loading: 'lazy' }),
    playMark()
  ),
  createElement('span', { className: 'extra-card-title' }, name),
  createElement('span', { className: 'extra-card-meta' }, 'YouTube'));
}

function fileCard(extra) {
  const card = createElement('a', {
    className: 'extra-card',
    href: `#/player/${extra.Id}`,
    dataset: { tvKey: `extra-${extra.Id}` }
  },
  createElement('span', { className: 'extra-card-thumb' },
    createElement('img', { src: MediaApi.getImageUrl(extra.Id, 'Primary', 480), alt: '', loading: 'lazy', onError: (event) => { event.currentTarget.remove(); } }),
    playMark()
  ),
  createElement('span', { className: 'extra-card-title' }, extra.Name || 'Extra'),
  createElement('span', { className: 'extra-card-meta' }, formatTicksToDuration(extra.RunTimeTicks) || 'Extra'));
  return card;
}

// Trailers on YouTube (from the metadata) and extras stored as files.
export async function loadExtrasSection(item, title, { signal } = {}) {
  const remote = [];
  const seen = new Set();
  for (const trailer of item.RemoteTrailers || []) {
    const videoId = extractYouTubeVideoId(trailer?.Url);
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);
    remote.push({ videoId, name: trailer.Name || `Trailer ${remote.length + 1}` });
  }
  const { items: local = [] } = await MediaApi.getExtras(item.Id, { signal }).catch(() => ({ items: [] }));
  const cards = [
    ...remote.slice(0, 6).map(entry => youtubeCard({ ...entry, title })),
    ...local.map(fileCard)
  ];
  if (!cards.length) return null;
  return HorizontalCarousel({
    title: 'Trailer & Extras',
    items: cards,
    trackClass: 'extras-list',
    containerClass: 'detail-extras'
  });
}
