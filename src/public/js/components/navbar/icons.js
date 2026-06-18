import { createElement } from '../../utils/dom.js';

function createIcon(className, svgMarkup) {
  const icon = createElement('span', {
    className,
    'aria-hidden': 'true'
  });
  icon.innerHTML = svgMarkup;
  return icon;
}

export { createIcon };

export function createNavIcon(key) {
  const icons = {
    home: `
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="m3 11 9-8 9 8"></path>
        <path d="M5 10v10h5v-6h4v6h5V10"></path>
      </svg>
    `,
    movies: `
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="6" width="18" height="14" rx="2"></rect>
        <path d="m7 6-2-4"></path>
        <path d="m12 6-2-4"></path>
        <path d="m17 6-2-4"></path>
      </svg>
    `,
    series: `
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="13" rx="2"></rect>
        <path d="M8 21h8"></path>
        <path d="M12 17v4"></path>
      </svg>
    `,
    publishers: `
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 21h18"></path>
        <path d="M5 21V9l5-3v15"></path>
        <path d="M10 21V5l6 3v13"></path>
        <path d="M16 21v-8h3v8"></path>
        <path d="M7 12h1"></path>
        <path d="M12 11h1"></path>
      </svg>
    `,
    requests: `
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20l1.2-4.4A8.4 8.4 0 1 1 21 11.5Z"></path>
        <path d="M8 12h.01"></path>
        <path d="M12 12h.01"></path>
        <path d="M16 12h.01"></path>
      </svg>
    `,
    search: `
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="7"></circle>
        <path d="m20 20-4-4"></path>
      </svg>
    `,
    settings: `
      <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.08V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.08-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.08V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.28.37.66.62 1.08.7H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z"></path>
      </svg>
    `
  };

  return createIcon('mobile-nav-icon', icons[key] || icons.home);
}

export function createUserIcon() {
  return createIcon('settings-profile-icon', `
    <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21a8 8 0 0 0-16 0"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  `);
}

export function createMovieIcon() {
  return createIcon('settings-row-icon settings-accent-icon', `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 6h16v14H4z"></path>
      <path d="M8 6 6 2"></path>
      <path d="M12 6 10 2"></path>
      <path d="M16 6 14 2"></path>
    </svg>
  `);
}

export function createScreenIcon() {
  return createIcon('settings-row-icon settings-accent-icon', `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="2"></rect>
      <path d="M8 20h8"></path>
      <path d="M12 16v4"></path>
    </svg>
  `);
}

export function createPlayOutlineIcon() {
  return createIcon('settings-row-icon settings-accent-icon', `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 4.5v15l13-7.5z"></path>
    </svg>
  `);
}

export function createPasswordIcon() {
  return createIcon('settings-row-icon', `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4" y="10" width="16" height="10" rx="2"></rect>
      <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
    </svg>
  `);
}

export function createPaletteIcon() {
  return createIcon('settings-row-icon', `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22a10 10 0 1 1 10-10c0 1.9-1.3 3-3 3h-1.5a1.5 1.5 0 0 0-1.1 2.5l.3.3c1 1 1 2.6-.1 3.4-.9.5-2 .8-3.6.8z"></path>
      <circle cx="7.5" cy="10.5" r=".8"></circle>
      <circle cx="10.5" cy="7.5" r=".8"></circle>
      <circle cx="14.5" cy="7.5" r=".8"></circle>
      <circle cx="16.5" cy="11" r=".8"></circle>
    </svg>
  `);
}

export function createPlaybackIcon() {
  return createIcon('settings-row-icon', `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 4.5v15l13-7.5z"></path>
      <path d="M4 4v16"></path>
      <path d="M20 6v12"></path>
    </svg>
  `);
}

export function createAdminIcon() {
  return createIcon('settings-row-icon', `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
    </svg>
  `);
}

export function createLogoutIcon() {
  return createIcon('settings-row-icon settings-logout-icon', `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <path d="M16 17l5-5-5-5"></path>
      <path d="M21 12H9"></path>
    </svg>
  `);
}

export function createChatIcon() {
  return createIcon('admin-tool-card-icon', `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `);
}

export function createTranscodingIcon() {
  return createIcon('admin-tool-card-icon', `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 7h4"></path>
      <circle cx="14" cy="7" r="2"></circle>
      <path d="M20 7h-2"></path>
      <path d="M4 17h2"></path>
      <circle cx="10" cy="17" r="2"></circle>
      <path d="M20 17h-6"></path>
    </svg>
  `);
}

export function createChevronIcon() {
  return createIcon('settings-chevron', `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m9 18 6-6-6-6"></path>
    </svg>
  `);
}

export function createBackIcon() {
  return createIcon('settings-header-icon', `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m15 18-6-6 6-6"></path>
    </svg>
  `);
}

export function createCloseIcon() {
  return createIcon('settings-header-icon', `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6 6 18"></path>
      <path d="m6 6 12 12"></path>
    </svg>
  `);
}

export function createCheckIcon() {
  return createIcon('settings-check', `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m20 6-11 11-5-5"></path>
    </svg>
  `);
}
