import { describe, it, expect } from 'vitest';
import { detectTv, TV_PATTERN } from '../../../src/public/js/shared/tvDetect.js';

const TVS = [
  ['tizen', 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/76.0.3809.146 TV Safari/537.36'],
  ['webos', 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36 WebAppManager'],
  ['androidtv', 'Mozilla/5.0 (Linux; Android 12; Chromecast) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 CrKey/1.56.500000 DeviceType/AndroidTV'],
  ['firetv', 'Mozilla/5.0 (Linux; Android 9; AFTKA Build/PS7633) AppleWebKit/537.36 (KHTML, like Gecko) Silk/112.3.1 like Chrome/112.0.5615.213 Safari/537.36'],
  ['androidtv', 'Mozilla/5.0 (Linux; Android 9; BRAVIA 4K UR2 Build/PTT1.190515.001.S52) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0 Safari/537.36'],
  ['androidtv', 'Mozilla/5.0 (Linux; Android 11; SHIELD Android TV Build/RQ1A.210105.003; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0 Mobile Safari/537.36'],
  ['other', 'HbbTV/1.5.1 (+DRM; Panasonic; SmartTV2021; 3.0; 1.0;) CE-HTML/1.0']
];

const NOT_TVS = [
  'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
  'Mozilla/5.0 (Linux; Tizen 5.5; SAMSUNG SM-R820) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/1.0 Chrome/69.0 Mobile Safari/537.36',
  ''
];

describe('detectTv', () => {
  it.each(TVS)('recognises %s', (platform, ua) => {
    expect(detectTv(ua)).toEqual({ isTv: true, platform, confidence: 'sure' });
    // intro-gate.js decides with this pattern before the first paint.
    expect(TV_PATTERN.test(ua)).toBe(true);
  });

  it.each(NOT_TVS.map(ua => [ua]))('leaves out %s', (ua) => {
    expect(detectTv(ua).isTv).toBe(false);
    expect(TV_PATTERN.test(ua)).toBe(false);
  });

  it('matches the copy of the pattern in intro-gate.js', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync('src/public/js/intro-gate.js', 'utf8');
    expect(source).toContain(`var TV_PATTERN = ${TV_PATTERN.toString()};`);
  });
});
