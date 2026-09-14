import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import initSqlJs from 'sql.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SqliteSessionStore } from '../../../src/server/db/session-store.js';

const SQL = await initSqlJs();
const DAY = 24 * 60 * 60 * 1000;

const promisify = (store, method, ...args) => new Promise((resolve, reject) => {
  store[method](...args, (error, result) => (error ? reject(error) : resolve(result)));
});

describe('SqliteSessionStore', () => {
  let clock;
  let stores;

  const createStore = (options = {}) => {
    const store = new SqliteSessionStore({ SQL, file: null, now: () => clock, ...options });
    stores.push(store);
    return store;
  };

  beforeAll(() => { stores = []; });
  afterEach(() => { stores.splice(0).forEach(store => store.close()); });

  it('stores, updates and destroys sessions', async () => {
    clock = 1_000_000;
    const store = createStore();

    await promisify(store, 'set', 'sid-1', { cookie: {}, userId: 'u1' });
    expect(await promisify(store, 'get', 'sid-1')).toEqual({ cookie: {}, userId: 'u1' });

    await promisify(store, 'set', 'sid-1', { cookie: {}, userId: 'u1', isAdmin: true });
    expect((await promisify(store, 'get', 'sid-1')).isAdmin).toBe(true);
    expect(await promisify(store, 'length')).toBe(1);

    await promisify(store, 'destroy', 'sid-1');
    expect(await promisify(store, 'get', 'sid-1')).toBeNull();
  });

  it('expires sessions by their cookie expiry and session cookies after a day', async () => {
    clock = 1_000_000;
    const store = createStore();
    const inTwoWeeks = new Date(clock + 14 * DAY).toISOString();

    await promisify(store, 'set', 'remembered', { cookie: { expires: inTwoWeeks }, userId: 'u1' });
    await promisify(store, 'set', 'plain', { cookie: {}, userId: 'u2' });

    clock += DAY + 1;
    expect(await promisify(store, 'get', 'plain')).toBeNull();
    expect(await promisify(store, 'get', 'remembered')).not.toBeNull();

    clock += 14 * DAY;
    expect(await promisify(store, 'get', 'remembered')).toBeNull();
  });

  it('extends the expiry on touch', async () => {
    clock = 1_000_000;
    const store = createStore();
    await promisify(store, 'set', 'sid', { cookie: {}, userId: 'u1' });

    clock += DAY - 1000;
    await promisify(store, 'touch', 'sid', { cookie: {} });
    clock += DAY - 1000;
    expect(await promisify(store, 'get', 'sid')).not.toBeNull();
  });

  it('persists to disk and loads the sessions back on start', async () => {
    clock = 1_000_000;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vanta-sessions-'));
    const file = path.join(dir, 'sessions.db');

    const first = createStore({ file });
    await promisify(first, 'set', 'sid', { cookie: {}, userId: 'u1' });
    first.close();
    expect(fs.existsSync(file)).toBe(true);

    const second = createStore({ file });
    expect(await promisify(second, 'get', 'sid')).toEqual({ cookie: {}, userId: 'u1' });
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
