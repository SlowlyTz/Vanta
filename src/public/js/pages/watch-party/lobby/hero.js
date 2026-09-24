import { createElement } from '../../../utils/dom.js';
import { MediaApi } from '../../../api/media.api.js';
import { formatRuntime } from '../helpers.js';
import { icon } from './icons.js';

export function episodeLabel(snapshot) {
  if (!Number.isFinite(snapshot?.seasonNumber) || !Number.isFinite(snapshot?.episodeNumber)) return null;
  return `S${snapshot.seasonNumber} · F${snapshot.episodeNumber}`;
}

export function resumeLabel(positionMs) {
  const totalSeconds = Math.floor((Number(positionMs) || 0) / 1000);
  if (totalSeconds <= 0) return 'Von Anfang an';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const time = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
  return `Fortsetzen bei ${time}`;
}

export function heroMeta(snapshot = {}) {
  const parts = [];
  if (snapshot.productionYear) parts.push(String(snapshot.productionYear));
  if (snapshot.officialRating) parts.push(snapshot.officialRating);
  if (snapshot.communityRating) parts.push(`★ ${Number(snapshot.communityRating).toFixed(1)}`);
  const runtime = formatRuntime(snapshot.runtimeTicks);
  if (runtime) parts.push(runtime);
  return parts;
}

// The big picture of the lobby: backdrop, logo (or title), what exactly is
// about to play and from where.
export function createLobbyHero() {
  const backdrop = createElement('div', { className: 'watch-party-backdrop', 'aria-hidden': 'true' });
  const logo = createElement('img', { className: 'watch-party-hero-logo', alt: '', hidden: true, decoding: 'async' });
  const title = createElement('h1', { className: 'watch-party-hero-title' });
  const eyebrow = createElement('div', { className: 'watch-party-hero-eyebrow' });
  const subtitle = createElement('div', { className: 'watch-party-hero-subtitle' });
  const meta = createElement('ul', { className: 'watch-party-hero-meta', 'aria-label': 'Details' });
  const resume = createElement('div', { className: 'watch-party-hero-resume' });
  const element = createElement('section', { className: 'watch-party-hero' },
    eyebrow, logo, title, subtitle, meta, resume
  );

  let lastBackdropUrl = null;
  let lastLogoUrl = null;

  logo.addEventListener('load', () => {
    logo.hidden = false;
    element.classList.add('has-logo');
  });
  logo.addEventListener('error', () => {
    logo.hidden = true;
    element.classList.remove('has-logo');
  });

  const render = ({ snapshot = {}, ownerName, positionMs }) => {
    const name = snapshot.name || 'Unbekanntes Medium';
    eyebrow.textContent = ownerName ? `Watch Party von ${ownerName}` : 'Watch Party';
    title.textContent = snapshot.seriesName && snapshot.type === 'Episode' ? snapshot.seriesName : name;

    const episode = episodeLabel(snapshot);
    const subtitleText = snapshot.type === 'Episode'
      ? [episode, name].filter(Boolean).join(' · ')
      : '';
    subtitle.textContent = subtitleText;
    subtitle.hidden = !subtitleText;

    meta.innerHTML = '';
    heroMeta(snapshot).forEach(part => meta.appendChild(createElement('li', {}, part)));
    meta.hidden = meta.childElementCount === 0;

    resume.innerHTML = '';
    resume.append(icon(positionMs > 0 ? 'clock' : 'play'), createElement('span', {}, resumeLabel(positionMs)));

    const backdropUrl = snapshot.backdrop
      ? MediaApi.getImageUrl(snapshot.backdrop.id, 'Backdrop', 1920, { tag: snapshot.backdrop.tag, quality: 90 })
      : null;
    if (backdropUrl !== lastBackdropUrl) {
      lastBackdropUrl = backdropUrl;
      backdrop.style.backgroundImage = backdropUrl ? `url("${backdropUrl.replaceAll('"', '%22')}")` : '';
      backdrop.classList.toggle('has-image', Boolean(backdropUrl));
    }

    const logoUrl = snapshot.logo
      ? MediaApi.getImageUrl(snapshot.logo.id, 'Logo', 800, { tag: snapshot.logo.tag })
      : null;
    if (logoUrl !== lastLogoUrl) {
      lastLogoUrl = logoUrl;
      element.classList.remove('has-logo');
      logo.hidden = true;
      logo.alt = title.textContent;
      if (logoUrl) logo.src = logoUrl;
      else logo.removeAttribute('src');
    }
  };

  return { element, backdrop, render };
}
