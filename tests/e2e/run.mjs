// End-to-end checks against a running VANTA (npm run build && npm start):
// the TV interface driven only with the arrow keys at 1920, 1280 and 960 px,
// and the trailer scroller actually playing while one scrolls down and up.
//
//   VANTA_E2E_URL=http://localhost:3000 VANTA_E2E_USER=… VANTA_E2E_PASSWORD=… npm run test:e2e
//
// Screenshots land in tests/e2e/output (not in git).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser, signIn } from './browser.mjs';

const base = (process.env.VANTA_E2E_URL || 'http://localhost:3000').replace(/\/$/, '');
const output = path.join(path.dirname(fileURLToPath(import.meta.url)), 'output');
fs.mkdirSync(output, { recursive: true });

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
  console.log(`${condition ? 'ok  ' : 'FAIL'} ${message}`);
};

async function tvChecks(page) {
  for (const [width, height] of [[1920, 1080], [1280, 720], [960, 540]]) {
    await page.viewport(width, height);
    await page.goto(`${base}/?tv=1#/home`);
    await page.wait(4000);
    check((await page.focus()) !== 'BODY', `TV ${width}: home has a focus`);
    // Nothing of the content may stick out to the right of the screen.
    const overflow = await page.eval('document.documentElement.scrollWidth - window.innerWidth');
    check(overflow <= 1, `TV ${width}: no sideways overflow (${overflow}px)`);
    const sidebarFits = await page.eval(`(() => { const items = [...document.querySelectorAll('.tv-sidebar-link')];
      return items.every(item => item.getBoundingClientRect().bottom <= window.innerHeight); })()`);
    check(sidebarFits, `TV ${width}: every sidebar entry is on screen`);
    await page.screenshot(path.join(output, `tv-home-${width}.png`));
  }

  await page.viewport(1920, 1080);
  await page.goto(`${base}/?tv=1#/home`);
  await page.wait(4000);
  await page.key('ArrowDown');
  check((await page.focus()).includes('media-card'), 'TV: down from the hero reaches a card');
  await page.key('ArrowLeft');
  await page.key('ArrowLeft');
  await page.key('ArrowLeft');
  check((await page.focus()).includes('tv-sidebar-link'), 'TV: left leads into the sidebar');
  for (let i = 0; i < 15; i += 1) await page.key('ArrowDown');
  check((await page.focus()).includes('tv-sidebar-link'), 'TV: down stays inside the sidebar');

  // Search: type with the on-screen keyboard, then reach the results.
  await page.goto(`${base}/?tv=1#/search`);
  await page.wait(2500);
  check((await page.focus()).includes('osk-key'), 'TV search: starts on the on-screen keyboard');
  await page.eval(`(() => { const input = document.querySelector('.search-input-field'); input.value = 'a'; input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await page.wait(2500);
  let reached = false;
  for (let i = 0; i < 14 && !reached; i += 1) {
    await page.key('ArrowRight');
    reached = (await page.focus()).includes('media-card');
  }
  const results = await page.eval(`document.querySelectorAll('#search-results .media-card').length`);
  check(!results || reached, `TV search: results reachable with the arrow keys (${results} results)`);

  // Down from a card never skips a row, however few titles it holds.
  await page.goto(`${base}/?tv=1#/home`);
  await page.wait(4000);
  const rows = await page.eval(`[...document.querySelectorAll('.home-page .carousel-track')].map(track => track.querySelectorAll('[data-item-id]').length)`);
  await page.key('ArrowDown');
  const visited = [];
  for (let i = 0; i < rows.length - 1; i += 1) {
    await page.key('ArrowRight');
    await page.key('ArrowRight');
    await page.key('ArrowRight');
    visited.push(await page.eval(`[...document.querySelectorAll('.home-page .carousel-track')].findIndex(track => track.contains(document.activeElement))`));
    await page.key('ArrowDown');
  }
  // Each step down is the next row (the start may be a remembered card).
  const last = rows.length - 1;
  const noSkip = visited.every((row, index) => index === 0 || row === Math.min(visited[index - 1] + 1, last));
  check(noSkip, `TV home: down visits every row in turn (${visited.join(', ')})`);

  // "Zurück" brings the card back; the same page opened anew starts at its top.
  const deepCard = await page.eval(`document.activeElement?.dataset.itemId || ''`);
  await page.key('Enter');
  await page.wait(3000);
  await page.key('Escape');
  await page.wait(3000);
  const backTo = await page.eval(`document.activeElement?.dataset.itemId || ''`);
  check(deepCard && backTo === deepCard, 'TV home: Back from a title returns to its card');
  await page.eval(`location.hash = '#/series'`);
  await page.wait(2500);
  await page.eval(`location.hash = '#/home'`);
  await page.wait(3500);
  const reopened = await page.focus();
  check(reopened.includes('hero') || reopened.includes('btn-primary'), `TV home: opened again from the menu it starts at the top (${reopened})`);
  check((await page.eval('Math.round(scrollY)')) === 0, 'TV home: opened again it is scrolled to the top');

  // The keyboard goes straight down, whatever was pressed before.
  await page.goto(`${base}/?tv=1#/search`);
  await page.wait(2500);
  await page.key('ArrowDown');
  await page.key('ArrowDown');
  await page.key('ArrowUp');
  await page.key('ArrowRight');
  await page.key('ArrowDown');
  const keyBelowW = await page.focus();
  check(/ s$/.test(keyBelowW), `TV keyboard: down from "w" is "s" (${keyBelowW})`);

  // Nothing around a focused card or tab cuts its ring.
  const clipped = selector => page.eval(`(() => { const element = document.querySelector('${selector}'); if (!element) return 'missing';
    for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (node.matches('.carousel-track, #app')) continue;
      if (style.overflowX !== 'visible' || style.overflowY !== 'visible') return node.className || node.tagName;
    } return ''; })()`);
  await page.goto(`${base}/?tv=1#/series`);
  await page.wait(3000);
  const firstCard = await page.eval(`document.querySelector('.library-page [data-item-id]')?.dataset.itemId || ''`);
  if (firstCard) {
    await page.goto(`${base}/?tv=1#/item/${firstCard}`);
    await page.wait(3500);
    check((await clipped('.media-carousel-container .media-card')) === '', 'TV detail: no section cuts the cards of its rows');
  }
  await page.goto(`${base}/?tv=1#/profile`);
  await page.wait(3000);
  check((await clipped('.profile-tab-button')) === '', 'TV profile: the tabs are not cut');

  // An empty page hands the focus to the sidebar; the admin area is not there.
  await page.goto(`${base}/?tv=1#/admin`);
  await page.wait(1500);
  check(!(await page.eval('location.hash')).startsWith('#/admin'), 'TV: the admin area leads home');

  // Settings: OK opens an area, Back goes one step, then closes.
  await page.goto(`${base}/?tv=1#/home`);
  await page.wait(3000);
  await page.eval(`document.querySelector('[data-tv-key="nav-settings"]').click()`);
  await page.wait(1000);
  check((await page.focus()).includes('settings-option'), 'TV settings: start on an area');
  const shownBefore = await page.eval(`document.querySelector('.settings-dialog').dataset.view`);
  await page.key('ArrowDown');
  const shownAfter = await page.eval(`document.querySelector('.settings-dialog').dataset.view`);
  check(shownBefore !== shownAfter, `TV settings: moving over the areas shows them without OK (${shownBefore} → ${shownAfter})`);
  await page.key('ArrowRight');
  await page.key('ArrowDown');
  await page.key('ArrowDown');
  check(!(await page.focus()).includes('settings-option'), 'TV settings: down inside an area stays in it');
  // Left goes through a row of choices first, then out of the area.
  for (let i = 0; i < 6 && !(await page.focus()).includes('settings-option'); i += 1) await page.key('ArrowLeft');
  const backOnRow = await page.eval(`document.querySelector('.settings-dialog').dataset.view`);
  check(backOnRow === shownAfter && (await page.focus()).includes('settings-option'), `TV settings: left from an area comes back to its row (${backOnRow})`);
  await page.key('Enter');
  const inArea = await page.focus();
  check(!inArea.includes('settings-option'), 'TV settings: OK goes into the area');
  await page.key('Escape');
  check((await page.focus()).includes('settings-option'), 'TV settings: Back returns to the area list');
  await page.key('Escape');
  check(!(await page.eval(`document.querySelector('.settings-modal-backdrop')?.classList.contains('open')`)), 'TV settings: second Back closes');
}

async function scrollerChecks(page) {
  await page.viewport(1440, 900);
  await page.goto(`${base}/?tv=0#/scroller`);
  await page.wait(4000);
  // The YouTube embeds report their state to the page; keep the last one per slide.
  await page.eval(`window.__yt = {}; window.addEventListener('message', event => {
    if (typeof event.data !== 'string' || !event.data.includes('infoDelivery')) return;
    let data; try { data = JSON.parse(event.data); } catch { return; }
    const frame = [...document.querySelectorAll('iframe')].find(item => item.contentWindow === event.source);
    const key = frame?.closest('.trailer-slide')?.dataset.index;
    if (key === undefined) return;
    const entry = window.__yt[key] || (window.__yt[key] = {});
    if (data.info.playerState !== undefined) entry.state = data.info.playerState;
    if (data.info.currentTime !== undefined) entry.time = data.info.currentTime; });`);
  const start = await page.eval(`(() => { const b = [...document.querySelectorAll('button')].find(item => /Scroller öffnen/.test(item.textContent) && item.offsetParent);
    if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  if (start) await page.click(start.x, start.y);
  await page.wait(8000);
  const total = await page.eval(`document.querySelectorAll('.trailer-slide').length`);
  const steps = Math.min(4, Math.max(0, total - 1));
  const playing = async () => page.eval(`(() => { const active = [...document.querySelectorAll('.trailer-slide')].findIndex(s => s.classList.contains('is-active'));
    return { active, state: window.__yt[active]?.state }; })()`);
  for (const direction of [1, -1]) {
    for (let i = 0; i < steps; i += 1) {
      await page.wheel(720, 450, direction * 400);
      await page.wait(8000);
      const { active, state } = await playing();
      check(state === 1, `Scroller: trailer ${active} plays after scrolling ${direction > 0 ? 'down' : 'up'} (state ${state})`);
    }
  }
  await page.screenshot(path.join(output, 'scroller.png'));
}

const browser = await launchBrowser();
try {
  await signIn(browser.page, base);
  await tvChecks(browser.page);
  await scrollerChecks(browser.page);
} catch (error) {
  failures.push(error.message);
  console.error(error);
} finally {
  await browser.close();
}

console.log(failures.length ? `\n${failures.length} check(s) failed.` : '\nAll end-to-end checks passed.');
process.exit(failures.length ? 1 : 0);
