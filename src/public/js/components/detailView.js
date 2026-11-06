// Layout of the item detail page: a cinema hero (backdrop, glow in the cover's
// colours, logo or title, facts and actions), then the page's sections.
import { createElement } from '../utils/dom.js';
import { createPosterPlaceholder } from '../utils/poster.js';
import { createExpandableText } from './expandableText.js';
import { createMetaIcon } from './metaIcons.js';
import { cssUrl } from '../utils/image.js';
import { genreLabel } from '../shared/genreLabels.js';

// Two lines on phones, a little more room on wide screens.
const overviewLines = () => (window.matchMedia?.('(max-width: 768px)').matches ? 3 : 4);

// "2024 · 1 Std. 40 Min. · Film": plain facts as one quiet line.
function factLine(item) {
  const parts = [item.year, item.duration, item.typeLabel].filter(Boolean);
  if (!parts.length) return null;
  return createElement('p', { className: 'detail-factline' },
    ...parts.flatMap((part, index) => (index ? [createElement('span', { className: 'detail-factline-dot', 'aria-hidden': 'true' }, '·'), part] : [part])));
}

// A chip: an icon or a short label, then the value.
export function detailChip({ icon = null, label = null, value, title = null, tone = '' }) {
  return createElement('span', { className: `detail-chip ${tone}`.trim(), title: title || undefined },
    icon ? createMetaIcon(icon) : null,
    label ? createElement('span', { className: 'detail-chip-label' }, label) : null,
    createElement('span', { className: 'detail-chip-value' }, value));
}

// The title: Jellyfin's logo where there is one (the name stays for screen
// readers), else the name in large type.
function titleElement(item) {
  const heading = createElement('h1', { className: `detail-title${item.logoUrl ? ' has-logo' : ''}` });
  if (item.logoUrl) {
    const logo = createElement('img', { className: 'detail-logo', src: item.logoUrl, alt: item.name, decoding: 'async' });
    // A broken logo falls back to the plain name.
    logo.addEventListener('error', () => {
      heading.classList.remove('has-logo');
      heading.replaceChildren(item.name);
    }, { once: true });
    heading.appendChild(logo);
  } else {
    heading.textContent = item.name;
  }
  return heading;
}

export function DetailView({
  item,
  actions,
  favoriteButton,
  watchlistButton = null,
  playedButton = null,
  chips = [],
  versionPicker = null,
  heroControls = null,
  statusContent = null,
  helpLinks = null,
  sections = []
}) {
  const container = createElement('div', { className: 'page-container' });

  // Each genre leads to its list of films or series.
  const genreType = item.itemType === 'Series' ? 'Series' : 'Movie';
  const genreTags = (item.genres || []).map(genre =>
    createElement('a', { className: 'genre-tag', href: `#/genre/${genreType}/${encodeURIComponent(genre)}` }, genreLabel(genre))
  );

  // Stable keys let a TV remote come back from the player onto the button
  // it left from (the first one is play/continue, whatever its label).
  const actionButtons = (actions || []).map((action, index) => {
    const btn = createElement('button', {
      className: action.className || 'btn-primary',
      dataset: { tvKey: index === 0 ? 'detail-play' : `detail-action-${index}` },
      onClick: action.onClick
    });
    if (action.icon) {
      btn.innerHTML = `${action.icon}${action.label}`;
    } else {
      btn.textContent = action.label;
    }
    if (action.note) btn.appendChild(createElement('span', { className: 'detail-action-note' }, action.note));
    if (action.progress) {
      btn.classList.add('has-progress');
      btn.appendChild(createElement('span', { className: 'detail-action-progress', style: { width: `${Math.round(action.progress * 100)}%` } }));
    }
    return btn;
  });
  [watchlistButton, favoriteButton, playedButton].filter(Boolean).forEach(button => actionButtons.push(button));

  const posterImg = createElement('img', {
    src: item.posterUrl || createPosterPlaceholder(item.name || '?'),
    alt: item.name
  });
  if (item.posterUrl) {
    posterImg.onerror = (e) => {
      e.currentTarget.onerror = null;
      e.currentTarget.src = createPosterPlaceholder(item.name || '?');
    };
  }

  const detailPageEl = createElement('div', { className: `detail-page detail-cinema${item.logoUrl ? ' has-logo' : ''}` },
    createElement('div', {
      className: 'detail-hero-backdrop',
      style: item.backdropUrl ? { backgroundImage: cssUrl(item.backdropUrl) } : {}
    }),
    createElement('div', { className: 'detail-hero-glow', 'aria-hidden': 'true' }),
    heroControls,
    createElement('div', { className: 'detail-content' },
      createElement('div', { className: 'detail-hero-main' },
        createElement('div', { className: 'detail-poster' }, posterImg),
        createElement('div', { className: 'detail-info-head' },
          titleElement(item),
          item.originalTitle ? createElement('span', { className: 'detail-original-title' }, item.originalTitle) : null,
          item.episodeTitle ? createElement('div', { className: 'detail-episode-title' }, item.episodeTitle) : null,
          factLine(item),
          chips.length ? createElement('div', { className: 'detail-metadata detail-chips' }, chips) : null
        ),
        createElement('div', { className: 'detail-info' },
          item.tagline ? createElement('p', { className: 'detail-tagline' }, `„${item.tagline}“`) : null,
          statusContent,
          // A row: right at its end stops instead of dropping into the cast.
          actionButtons.length ? createElement('div', { className: 'detail-actions', 'data-tv-row': '', 'data-tv-remember': '' }, actionButtons) : null,
          versionPicker,
          item.overview ? createExpandableText({ text: item.overview, lines: overviewLines(), className: 'detail-overview' }) : null,
          genreTags.length ? createElement('div', { className: 'detail-genres' }, genreTags) : null,
          helpLinks
        )
      )
    )
  );

  container.appendChild(detailPageEl);
  sections.filter(Boolean).forEach(section => {
    container.appendChild(createElement('div', { className: 'content-section detail-extra-section' }, section));
  });
  return container;
}
