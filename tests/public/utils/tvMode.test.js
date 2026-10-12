import { describe, it, expect, beforeEach } from 'vitest';
import { applyTvUrlOverride, getTvChoice, isTvMode, looksLikeTv, markTvSuggested, setTvChoice, shouldSuggestTvMode } from '../../../src/public/js/utils/tvMode.js';

const TIZEN = 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.0) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/4.0 Chrome/76.0 TV Safari/537.36';
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36';
const media = (answers) => query => ({ matches: Boolean(answers[query]) });

describe('tvMode', () => {
  beforeEach(() => localStorage.clear());

  it('switches on by itself on a known TV, and the choice of the device wins', () => {
    expect(isTvMode({ userAgent: TIZEN })).toBe(true);
    expect(isTvMode({ userAgent: DESKTOP })).toBe(false);
    setTvChoice('off');
    expect(isTvMode({ userAgent: TIZEN })).toBe(false);
    setTvChoice('on');
    expect(isTvMode({ userAgent: DESKTOP })).toBe(true);
    setTvChoice(null);
    expect(getTvChoice()).toBeNull();
  });

  it('takes ?tv=1 and ?tv=0 from the address and keeps them', () => {
    applyTvUrlOverride('?tv=1');
    expect(getTvChoice()).toBe('on');
    applyTvUrlOverride('?tv=0');
    expect(getTvChoice()).toBe('off');
    applyTvUrlOverride('?x=1');
    expect(getTvChoice()).toBe('off');
  });

  it('suggests TV mode once on a big screen without hover and touch', () => {
    const tvLike = { userAgent: DESKTOP, matchMedia: media({ '(hover: none) and (pointer: none)': true }), maxTouchPoints: 0, width: 1920 };
    expect(looksLikeTv(tvLike)).toBe(true);
    expect(looksLikeTv({ ...tvLike, maxTouchPoints: 5 })).toBe(false);
    expect(looksLikeTv({ ...tvLike, width: 1024 })).toBe(false);
    expect(shouldSuggestTvMode(tvLike)).toBe(true);
    markTvSuggested();
    expect(shouldSuggestTvMode(tvLike)).toBe(false);
  });
});
