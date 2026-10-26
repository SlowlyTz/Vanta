import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// jsdom has toggleAttribute; take it away to see the polyfill step in, as on
// Chromium 68 (webOS 5).
describe('polyfills: toggleAttribute', () => {
  let original;
  beforeAll(async () => {
    original = Element.prototype.toggleAttribute;
    delete Element.prototype.toggleAttribute;
    await import('../../src/public/js/polyfills.js?missing-toggle');
  });
  afterAll(() => {
    Element.prototype.toggleAttribute = original;
  });

  it('adds, removes and forces an attribute', () => {
    const el = document.createElement('div');
    expect(el.toggleAttribute('data-paused')).toBe(true);
    expect(el.hasAttribute('data-paused')).toBe(true);
    expect(el.toggleAttribute('data-paused')).toBe(false);
    expect(el.hasAttribute('data-paused')).toBe(false);
    expect(el.toggleAttribute('data-paused', true)).toBe(true);
    expect(el.toggleAttribute('data-paused', true)).toBe(true);
    expect(el.toggleAttribute('data-paused', false)).toBe(false);
    expect(el.hasAttribute('data-paused')).toBe(false);
  });
});

describe('polyfills: inert', () => {
  let descriptor;
  beforeAll(async () => {
    descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'inert');
    delete HTMLElement.prototype.inert;
    await import('../../src/public/js/polyfills.js?missing-inert');
  });
  afterAll(() => {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, 'inert', descriptor);
  });

  it('mirrors the property in the attribute', () => {
    const el = document.createElement('div');
    el.inert = true;
    expect(el.hasAttribute('inert')).toBe(true);
    expect(el.inert).toBe(true);
    el.inert = false;
    expect(el.hasAttribute('inert')).toBe(false);
  });
});
