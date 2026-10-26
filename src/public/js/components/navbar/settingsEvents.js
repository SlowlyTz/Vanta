// Opens the settings at an area from anywhere in the app:
// window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT, { detail: { area: 'notifications' } })).
export const OPEN_SETTINGS_EVENT = 'vanta:open-settings';
