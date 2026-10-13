import { detectTv } from '../shared/tvDetect.js';

// The 10-foot interface: on by itself on a known TV, suggested where it looks
// like one, and switchable per device (settings → Darstellung, or ?tv=1 /
// ?tv=0 in the address). The choice is kept per device.
export const TV_MODE_KEY = 'vanta.tvMode';
const SUGGESTION_KEY = 'vanta.tvMode.suggested';

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

// 'on' | 'off' | null (automatic).
export function getTvChoice() {
  const value = storage()?.getItem(TV_MODE_KEY);
  return value === 'on' || value === 'off' ? value : null;
}

export function setTvChoice(choice) {
  try {
    if (choice === 'on' || choice === 'off') storage()?.setItem(TV_MODE_KEY, choice);
    else storage()?.removeItem(TV_MODE_KEY);
  } catch {
    // Private mode: the choice lasts as long as the page.
  }
}

// ?tv=1 / ?tv=0 in the address switches and keeps it.
export function applyTvUrlOverride(search = window.location.search) {
  const value = new URLSearchParams(search).get('tv');
  if (value === '1') setTvChoice('on');
  else if (value === '0') setTvChoice('off');
}

export function isTvMode({ userAgent = navigator.userAgent } = {}) {
  const choice = getTvChoice();
  if (choice) return choice === 'on';
  return detectTv(userAgent).isTv;
}

// Not sure, but looks like a TV: no hover and no fine pointer, no touch, a
// wide screen. Then VANTA asks once.
export function looksLikeTv({ matchMedia = window.matchMedia?.bind(window), maxTouchPoints = navigator.maxTouchPoints, width = window.screen?.width || window.innerWidth } = {}) {
  if (typeof matchMedia !== 'function' || width < 1280 || maxTouchPoints > 0) return false;
  const noPointer = matchMedia('(hover: none) and (pointer: none)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  return noPointer || coarse;
}

export function shouldSuggestTvMode(options = {}) {
  if (getTvChoice() !== null || isTvMode(options)) return false;
  if (storage()?.getItem(SUGGESTION_KEY)) return false;
  return looksLikeTv(options);
}

export function markTvSuggested() {
  try { storage()?.setItem(SUGGESTION_KEY, '1'); } catch { /* asked again next time */ }
}
