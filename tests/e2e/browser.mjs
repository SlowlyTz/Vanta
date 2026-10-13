// A small Chromium remote-control for the end-to-end checks: starts a
// headless, muted Chromium with its own profile and drives one page over the
// DevTools protocol. No test framework; each check returns its findings.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const KEY_CODES = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Enter: 13, Escape: 27, Backspace: 8 };

export async function launchBrowser({ chrome = process.env.CHROME_BIN || '/usr/bin/chromium' } = {}) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vanta-e2e-'));
  const port = 9300 + Math.floor(Math.random() * 500);
  const child = spawn(chrome, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--mute-audio', '--autoplay-policy=no-user-gesture-required', 'about:blank'
  ], { stdio: 'ignore' });

  let url = null;
  for (let i = 0; i < 50 && !url; i += 1) {
    await wait(200);
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      url = targets.find(target => target.type === 'page')?.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
  }
  if (!url) throw new Error('Chromium did not start');

  const socket = new WebSocket(url);
  await new Promise(resolve => socket.on('open', resolve));
  let id = 0;
  const pending = new Map();
  socket.on('message', message => {
    const data = JSON.parse(message);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
    }
  });
  const send = (method, params = {}) => new Promise(resolve => {
    id += 1;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
  await send('Page.enable');
  await send('Runtime.enable');

  const page = {
    wait,
    async goto(target) {
      await send('Page.navigate', { url: target });
      await wait(1500);
    },
    async eval(expression) {
      const answer = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (answer.result?.exceptionDetails) throw new Error(answer.result.exceptionDetails.exception?.description || 'evaluate failed');
      return answer.result?.result?.value;
    },
    async key(key) {
      const code = KEY_CODES[key] || 0;
      await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code });
      if (key === 'Enter') await send('Input.dispatchKeyEvent', { type: 'char', key, text: '\r' });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code });
      await wait(350);
    },
    async click(x, y) {
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    },
    async wheel(x, y, deltaY) {
      await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY });
    },
    async viewport(width, height, mobile = false) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    },
    async screenshot(file) {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
    },
    // What holds the focus, in a short readable form.
    focus() {
      return this.eval(`(() => { const a = document.activeElement; if (!a || a === document.body) return 'BODY';
        return a.tagName + '.' + String(a.className || '').split(' ')[0] + ' ' + (a.getAttribute('aria-label') || a.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40); })()`);
    }
  };

  return {
    page,
    async close() {
      socket.close();
      const exited = new Promise(resolve => child.once('exit', resolve));
      child.kill();
      await Promise.race([exited, wait(3000)]);
      try {
        fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      } catch { /* a leftover temp profile is harmless */ }
    }
  };
}

// Signs the test user in through the API (VANTA_E2E_USER / VANTA_E2E_PASSWORD).
export async function signIn(page, base) {
  const user = process.env.VANTA_E2E_USER;
  const password = process.env.VANTA_E2E_PASSWORD;
  if (!user || !password) throw new Error('Set VANTA_E2E_USER and VANTA_E2E_PASSWORD for the end-to-end checks.');
  await page.goto(`${base}/?tv=0#/login`);
  await page.eval(`localStorage.setItem('vanta.intro.lastPlayedAt', String(Date.now()))`);
  const status = await page.eval(`fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(${JSON.stringify({ username: user, password })}) }).then(r => r.status)`);
  if (status !== 200) throw new Error(`Login failed with ${status}`);
}
