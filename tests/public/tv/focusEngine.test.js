import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { bindFocusEngine, createFocusEngine } from '../../../src/public/js/tv/focusEngine.js';
import { directionalScore } from '../../../src/public/js/shared/focusGeometry.js';
import { openModal, closeAllModals } from '../../../src/public/js/utils/modal.js';

// Lays elements out by data-rect="left,top,width,height".
const place = () => {
  document.querySelectorAll('[data-rect]').forEach(element => {
    const [left, top, width, height] = element.dataset.rect.split(',').map(Number);
    element.getBoundingClientRect = () => ({ left, top, width, height, right: left + width, bottom: top + height });
    element.scrollIntoView = () => {};
  });
};

const btn = (id, rect, extra = '') => `<button id="${id}" data-rect="${rect}" ${extra}>${id}</button>`;

describe('directionalScore', () => {
  const box = (left, top, width = 10, height = 10) => ({ left, top, width, height, right: left + width, bottom: top + height });
  it('prefers what lies straight in the direction', () => {
    const from = box(0, 0);
    expect(directionalScore(from, box(20, 0), 'right')).toBeLessThan(directionalScore(from, box(20, 30), 'right'));
    expect(directionalScore(from, box(-20, 0), 'right')).toBe(Infinity);
    expect(directionalScore(from, box(0, 20), 'down')).toBeLessThan(directionalScore(from, box(15, 20), 'down'));
  });
});

describe('focus engine', () => {
  let engine;
  beforeEach(() => {
    sessionStorage.clear();
    engine = createFocusEngine({ scrollSmooth: () => false });
  });
  afterEach(() => {
    closeAllModals();
    document.body.innerHTML = '';
  });

  it('moves through a grid by direction', () => {
    document.body.innerHTML = `<div id="main-content">
      ${btn('a', '0,0,100,100')}${btn('b', '120,0,100,100')}
      ${btn('c', '0,120,100,100')}${btn('d', '120,120,100,100')}
    </div>`;
    place();
    engine.start();
    expect(document.activeElement.id).toBe('a');
    engine.move('right');
    expect(document.activeElement.id).toBe('b');
    engine.move('down');
    expect(document.activeElement.id).toBe('d');
    engine.move('left');
    expect(document.activeElement.id).toBe('c');
    expect(document.activeElement.classList.contains('tv-focus')).toBe(true);
    expect(engine.move('left')).toBe(false);
  });

  it('keeps left/right inside a row and comes back to where a row was left', () => {
    document.body.innerHTML = `<div id="main-content">
      <div class="media-carousel" data-tv-row>${btn('r1a', '0,0,100,100')}${btn('r1b', '120,0,100,100')}${btn('r1c', '240,0,100,100')}</div>
      <div class="media-carousel" data-tv-row>${btn('r2a', '0,200,100,100')}${btn('r2b', '120,200,100,100')}</div>
    </div>`;
    place();
    engine.focus(document.getElementById('r1c'));
    engine.move('down');
    // A row entered the first time starts at its first visible card.
    expect(document.activeElement.id).toBe('r2a');
    engine.move('right');
    expect(document.activeElement.id).toBe('r2b');
    engine.move('up');
    // Back to the card of the first row that was focused last.
    expect(document.activeElement.id).toBe('r1c');
  });

  it('enters the sidebar on the current page, then where it was left', () => {
    document.body.innerHTML = `
      <nav class="tv-sidebar" data-tv-group="nav">${btn('home', '0,0,60,40')}<a id="movies" class="tv-sidebar-link active" href="#">m</a>${btn('settings', '0,500,60,40')}</nav>
      <div id="main-content" data-tv-group="content">${btn('c1', '100,480,100,100')}</div>`;
    document.getElementById('movies').setAttribute('data-rect', '0,60,60,40');
    place();
    engine.focus(document.getElementById('c1'));
    engine.move('left');
    expect(document.activeElement.id).toBe('movies');
  });

  it('moves between groups and returns to the group\'s last focus', () => {
    document.body.innerHTML = `
      <nav data-tv-group="nav">${btn('home', '0,0,60,40')}${btn('search', '0,60,60,40')}</nav>
      <div id="main-content" data-tv-group="content">${btn('c1', '100,0,100,100')}${btn('c2', '100,120,100,100')}</div>`;
    place();
    engine.focus(document.getElementById('c2'));
    engine.move('left');
    expect(document.activeElement.id).toBe('search');
    engine.move('up');
    expect(document.activeElement.id).toBe('home');
    engine.move('right');
    expect(document.activeElement.id).toBe('c2');
  });

  it('stays inside an open dialog', () => {
    document.body.innerHTML = `<div id="main-content">${btn('page', '0,0,100,100')}</div>`;
    const overlay = document.createElement('div');
    overlay.innerHTML = `<div class="dlg">${btn('yes', '300,300,80,40')}${btn('no', '400,300,80,40')}</div>`;
    document.body.appendChild(overlay);
    place();
    openModal({ overlay, dialog: overlay.querySelector('.dlg') });
    engine.focus(document.getElementById('yes'));
    engine.move('right');
    expect(document.activeElement.id).toBe('no');
    expect(engine.move('left')).toBe(true);
    expect(engine.candidates().map(element => element.id)).toEqual(['yes', 'no']);
  });

  it('remembers the focus of a page and brings it back', () => {
    window.location.hash = '#/home';
    document.body.innerHTML = `<div id="main-content">${btn('x', '0,0,100,100', 'data-item-id="m1"')}${btn('y', '120,0,100,100', 'data-item-id="m2"')}</div>`;
    place();
    engine.focus(document.getElementById('y'));
    document.body.innerHTML = `<div id="main-content">${btn('x', '0,0,100,100', 'data-item-id="m1"')}${btn('y', '120,0,100,100', 'data-item-id="m2"')}</div>`;
    place();
    engine.restore('#/home');
    expect(document.activeElement.id).toBe('y');
  });

  it('brings the focus back only to a page returned to, not to one opened anew', () => {
    const page = () => {
      document.body.innerHTML = `<div id="main-content">${btn('x', '0,0,100,100', 'data-item-id="m1"')}${btn('y', '0,400,100,100', 'data-item-id="m2"')}</div>`;
      place();
    };
    window.history.replaceState(null, '', '#/home');
    page();
    expect(engine.enterPage()).toBe(false);
    const homeVisit = window.history.state;
    engine.focus(document.getElementById('y'));

    window.history.pushState(null, '', '#/series');
    expect(engine.enterPage()).toBe(false);

    // "Zurück": the entry of the first visit, with its mark.
    window.history.pushState(homeVisit, '', '#/home');
    page();
    expect(engine.enterPage()).toBe(true);
    engine.restore('#/home');
    expect(document.activeElement.id).toBe('y');

    // The same page from the menu: a new visit, at its top.
    window.history.pushState(null, '', '#/home');
    page();
    expect(engine.enterPage()).toBe(false);
    engine.restore('#/home', { fresh: true });
    expect(document.activeElement.id).toBe('x');
  });

  it('starts at the top of the first page after the app starts, whatever its entry knew', () => {
    window.history.replaceState({ vantaTvVisit: 'old' }, '', '#/home');
    sessionStorage.setItem('vanta.tv.focus', JSON.stringify({ old: 'm2' }));
    expect(engine.enterPage()).toBe(false);
    expect(window.history.state.vantaTvVisit).not.toBe('old');
  });

  it('starts on [data-tv-autofocus] and skips hidden and disabled elements', () => {
    document.body.innerHTML = `<div id="main-content">${btn('hidden', '0,0,100,100', 'hidden')}${btn('off', '0,0,100,100', 'disabled')}${btn('go', '0,200,100,100', 'data-tv-autofocus')}</div>`;
    place();
    engine.start();
    expect(document.activeElement.id).toBe('go');
  });
});

describe('focus engine rows', () => {
  it('never stops on the row itself', () => {
    document.body.innerHTML = `<div id="main-content"><div data-tv-row tabindex="0" data-rect="0,0,400,100">${btn('a', '0,0,100,100')}</div></div>`;
    place();
    const engine = createFocusEngine({ scrollSmooth: () => false });
    expect(engine.candidates().map(element => element.id)).toEqual(['a']);
    document.body.innerHTML = '';
  });
});

describe('focus engine lines', () => {
  let engine;
  beforeEach(() => {
    sessionStorage.clear();
    engine = createFocusEngine({ scrollSmooth: () => false });
  });
  afterEach(() => {
    engine.destroy();
    document.body.innerHTML = '';
  });

  it('never skips a short row under the fourth card', () => {
    document.body.innerHTML = `<div id="main-content">
      <div class="media-carousel" data-tv-row>${btn('a1', '0,0,100,100')}${btn('a2', '120,0,100,100')}${btn('a3', '240,0,100,100')}${btn('a4', '360,0,100,100')}</div>
      <div class="media-carousel" data-tv-row>${btn('b1', '0,200,100,100')}</div>
      <div class="media-carousel" data-tv-row>${btn('c1', '0,400,100,100')}${btn('c2', '120,400,100,100')}${btn('c3', '240,400,100,100')}</div>
      <div class="media-carousel" data-tv-row>${btn('d1', '0,600,100,100')}${btn('d4', '360,600,100,100')}</div>
    </div>`;
    place();
    engine.focus(document.getElementById('a4'));
    engine.move('down');
    expect(document.activeElement.id).toBe('b1');
    engine.move('down');
    expect(document.activeElement.id).toBe('c1');
    // The end of a row stays the end.
    engine.focus(document.getElementById('b1'));
    expect(engine.move('right')).toBe(false);
    expect(document.activeElement.id).toBe('b1');
  });

  it('goes straight down on a grid of keys, whatever was pressed there before', () => {
    document.body.innerHTML = `<div id="main-content">
      <div data-tv-row>${btn('q', '0,0,40,40')}${btn('w', '50,0,40,40')}${btn('e', '100,0,40,40')}</div>
      <div data-tv-row>${btn('a', '0,50,40,40')}${btn('s', '50,50,40,40')}${btn('d', '100,50,40,40')}</div>
      <div data-tv-row>${btn('y', '0,100,40,40')}${btn('x', '50,100,40,40')}${btn('c', '100,100,40,40')}</div>
    </div>`;
    place();
    engine.focus(document.getElementById('a'));
    engine.focus(document.getElementById('w'));
    engine.move('down');
    expect(document.activeElement.id).toBe('s');
    engine.move('down');
    expect(document.activeElement.id).toBe('x');
  });
});

describe('focus engine columns, sidebar and fallbacks', () => {
  let engine;
  beforeEach(() => {
    sessionStorage.clear();
    engine = createFocusEngine({ scrollSmooth: () => false });
  });
  afterEach(() => {
    engine.destroy();
    document.body.innerHTML = '';
  });

  it('keeps up/down inside a column and leaves it only sideways', () => {
    document.body.innerHTML = `<div id="main-content">
      <div data-tv-group="keyboard">${btn('k1', '0,0,100,40')}${btn('k2', '0,300,100,40')}</div>
      <div data-tv-column>${btn('r1', '200,0,100,100')}${btn('r2', '200,140,100,100')}</div>
    </div>`;
    place();
    engine.focus(document.getElementById('r1'));
    engine.move('down');
    expect(document.activeElement.id).toBe('r2');
    // Nothing further down in the column: k2 (lower, to the left) is not taken.
    engine.move('down');
    expect(document.activeElement.id).toBe('r2');
    engine.move('left');
    expect(document.activeElement.id).toBe('k2');
  });

  it('enters the sidebar with left only', () => {
    document.body.innerHTML = `
      <nav class="tv-sidebar" data-tv-group="nav">${btn('nav1', '0,0,60,40')}${btn('nav2', '0,400,60,40')}</nav>
      <div id="main-content" data-tv-group="content">${btn('c1', '100,0,100,100')}</div>`;
    place();
    engine.focus(document.getElementById('c1'));
    expect(engine.move('down')).toBe(false);
    expect(document.activeElement.id).toBe('c1');
    engine.move('left');
    expect(document.activeElement.id).toBe('nav1');
  });

  it('hands an empty page to the active sidebar entry and waits for a remembered element', () => {
    window.location.hash = '#/movies';
    document.body.innerHTML = `
      <nav class="tv-sidebar"><a href="#/home" class="tv-sidebar-link" data-rect="0,0,60,40">h</a><a href="#/movies" class="tv-sidebar-link active" data-rect="0,60,60,40">m</a></nav>
      <div id="main-content"></div>`;
    place();
    expect(engine.restore('#/movies')).toBe(false);
    expect(engine.restore('#/movies', { fallback: true })).toBe(true);
    expect(document.activeElement.getAttribute('href')).toBe('#/movies');

    sessionStorage.setItem('vanta.tv.focus', JSON.stringify({ '#/home': 'late' }));
    document.getElementById('main-content').innerHTML = btn('early', '100,0,100,100');
    place();
    expect(engine.restore('#/home', { waitForKey: true })).toBe(false);
    document.getElementById('main-content').insertAdjacentHTML('beforeend', btn('late', '100,200,100,100'));
    place();
    expect(engine.restore('#/home', { waitForKey: true })).toBe(true);
    expect(document.activeElement.id).toBe('late');
  });

  it('marks whatever gets the focus, not only its own moves', () => {
    document.body.innerHTML = `<div id="main-content">${btn('a', '0,0,100,100')}${btn('b', '120,0,100,100')}</div>`;
    place();
    document.getElementById('a').focus();
    expect(document.getElementById('a').classList.contains('tv-focus')).toBe(true);
    document.getElementById('b').focus();
    expect(document.getElementById('a').classList.contains('tv-focus')).toBe(false);
    expect(document.getElementById('b').classList.contains('tv-focus')).toBe(true);
  });
});

describe('bindFocusEngine: text fields', () => {
  it('left/right move the caret, and leave the field at its edge (the connect code)', () => {
    document.body.innerHTML = `<main>
      <input id="code" type="text" data-rect="100,100,200,40">
      ${btn('next', '320,100,80,40')}
    </main>`;
    place();
    const moves = [];
    const engine = { move: direction => moves.push(direction) };
    const unbind = bindFocusEngine(engine);
    const input = document.getElementById('code');
    const press = key => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      input.dispatchEvent(event);
      return event;
    };

    input.focus();
    // Empty: both directions leave.
    expect(press('ArrowRight').defaultPrevented).toBe(true);
    expect(moves).toEqual(['right']);

    input.value = 'AB12';
    input.setSelectionRange(2, 2);
    expect(press('ArrowRight').defaultPrevented).toBe(false);
    expect(press('ArrowLeft').defaultPrevented).toBe(false);
    input.setSelectionRange(4, 4);
    expect(press('ArrowRight').defaultPrevented).toBe(true);
    input.setSelectionRange(0, 0);
    expect(press('ArrowLeft').defaultPrevented).toBe(true);
    unbind();
  });
});
