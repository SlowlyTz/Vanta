import { describe, it, expect } from 'vitest';
import { countdownDigit, overlayOpacity } from '../../../../src/public/js/pages/watch-party/countdown.js';

describe('Countdown-Fallback', () => {
  it('zeigt im Vorlauf die 5 und zählt dann jede Sekunde herunter', () => {
    expect(countdownDigit(5400)).toBe(5);
    expect(countdownDigit(5000)).toBe(5);
    expect(countdownDigit(4999)).toBe(5);
    expect(countdownDigit(4000)).toBe(4);
    expect(countdownDigit(1)).toBe(1);
    expect(countdownDigit(-20)).toBe(0);
  });

  it('blendet in den letzten 400 ms aus', () => {
    expect(overlayOpacity(1000)).toBe(1);
    expect(overlayOpacity(200)).toBeCloseTo(0.5);
    expect(overlayOpacity(0)).toBe(0);
  });
});
