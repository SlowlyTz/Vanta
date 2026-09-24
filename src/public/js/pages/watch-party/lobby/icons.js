const SVG_NS = 'http://www.w3.org/2000/svg';

const PATHS = {
  back: 'M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z',
  more: 'M6 10.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  link: 'M10.6 13.4a1 1 0 0 1 0-1.4l3.5-3.5a3 3 0 1 1 4.2 4.2l-2.1 2.1-1.4-1.4 2.1-2.1a1 1 0 1 0-1.4-1.4L12 13.4a1 1 0 0 1-1.4 0zm2.8-2.8a1 1 0 0 1 0 1.4l-3.5 3.5a3 3 0 1 1-4.2-4.2l2.1-2.1 1.4 1.4-2.1 2.1a1 1 0 1 0 1.4 1.4l3.5-3.5a1 1 0 0 1 1.4 0z',
  userPlus: 'M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-3.3 0-7 1.6-7 4v2h14v-2c0-2.4-3.7-4-7-4zm10-6V5h-2v3h-3v2h3v3h2v-3h3V8z',
  check: 'M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z',
  play: 'M8 5v14l11-7z',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 10.4 3.3 3.3-1.4 1.4-3.9-3.9V6h2z',
  close: 'M18.3 5.7 17 4.3l-5 5-5-5-1.4 1.4 5 5-5 5L7 17.1l5-5 5 5 1.4-1.4-5-5z'
};

export function icon(name, className = 'watch-party-icon') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', className);
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', PATHS[name] || '');
  svg.appendChild(path);
  return svg;
}
