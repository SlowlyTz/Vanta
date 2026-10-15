import { describe, it, expect } from 'vitest';
import { deviceLabel } from '../../../src/public/js/shared/deviceLabel.js';

describe('deviceLabel', () => {
  it('names browser and system', () => {
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36')).toBe('Chrome auf Windows');
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1')).toBe('Safari auf iPhone');
    expect(deviceLabel('Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0')).toBe('Firefox auf Linux');
    expect(deviceLabel('Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/76.0 TV Safari/537.36')).toBe('Samsung Internet auf Samsung TV');
    expect(deviceLabel('')).toBe('Unbekanntes Gerät');
  });
});
