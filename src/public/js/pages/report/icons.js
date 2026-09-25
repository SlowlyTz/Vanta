// Small inline icons of the report page.
const svg = (paths, size = 18) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

export const ICONS = {
  search: svg('<circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path>', 20),
  check: svg('<path d="M20 6 9 17l-5-5"></path>', 14),
  'no-german': svg('<path d="M4 7h9"></path><path d="M8.5 4v3"></path><path d="M6 17c2.5-1.5 4-4.5 4.5-10"></path><path d="M6.5 11c1 2 3 3.5 5.5 4"></path><path d="m13 20 4-9 4 9"></path><path d="M14.5 17h5"></path>'),
  'bad-quality': svg('<rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M7 9h2"></path><path d="M11 13h2"></path><path d="M15 9h2"></path><path d="M7 15h2"></path>'),
  playback: svg('<circle cx="12" cy="12" r="9"></circle><path d="m10 8.5 5 3.5-5 3.5z"></path><path d="M4 4l16 16"></path>'),
  other: svg('<path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L3 21l1.5-5.6A8.5 8.5 0 1 1 21 12z"></path><path d="M9 11h.01"></path><path d="M12 11h.01"></path><path d="M15 11h.01"></path>'),
  success: svg('<circle cx="12" cy="12" r="9"></circle><path d="m8 12 3 3 5-6"></path>', 30)
};

export function iconElement(createElement, key, className = '') {
  const element = createElement('span', { className, 'aria-hidden': 'true' });
  element.innerHTML = ICONS[key] || '';
  return element;
}
