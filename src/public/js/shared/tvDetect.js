// DOM-free: shared by the web app and the server (the playback profile).

// Which TV platform a user agent belongs to. Only patterns that a phone, a
// tablet or a desktop browser never carry count as sure; everything else is
// left to the heuristic on the client (see utils/tvMode.js).
// intro-gate.js repeats TV_PATTERN for the first paint; keep them in step.
const PLATFORMS = [
  { platform: 'tizen', test: ua => /Tizen/i.test(ua) && /SMART-TV|\bTV\b/i.test(ua) },
  { platform: 'webos', test: ua => /Web0S|webOS/i.test(ua) && /\bTV\b|SmartTV|NetCast/i.test(ua) },
  { platform: 'firetv', test: ua => /\bAFT[A-Z]/.test(ua) },
  { platform: 'androidtv', test: ua => /Android/i.test(ua) && /\bTV\b|GoogleTV|BRAVIA|AndroidTV/i.test(ua) },
  { platform: 'androidtv', test: ua => /CrKey|GoogleTV|BRAVIA/i.test(ua) },
  { platform: 'other', test: ua => /HbbTV|SMART-TV|SmartTV/i.test(ua) }
];

export const TV_PATTERN = /SMART-TV|SmartTV|HbbTV|Web0S|webOS.*TV|Tizen.*TV|\bAFT[A-Z]|CrKey|GoogleTV|BRAVIA|Android.*\bTV\b|AndroidTV/i;

export function detectTv(userAgent = '') {
  const ua = String(userAgent || '');
  const match = PLATFORMS.find(entry => entry.test(ua));
  return match ? { isTv: true, platform: match.platform, confidence: 'sure' } : { isTv: false, platform: null, confidence: null };
}
