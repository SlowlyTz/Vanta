import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import initSqlJs from 'sql.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SqliteSessionStore, publicSessionId } from '../../../src/server/db/session-store.js';

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

  it('lists a user\'s sessions under public ids and ends one of them', async () => {
    clock = 1_000_000;
    const store = createStore();
    await promisify(store, 'set', 'a', { cookie: {}, userId: 'u1', accessToken: 't1', device: { userAgent: 'Firefox', loginAt: 5 } });
    await promisify(store, 'set', 'b', { cookie: {}, userId: 'u1', accessToken: 't2' });
    await promisify(store, 'set', 'c', { cookie: {}, userId: 'u2' });

    const sessions = await store.listByUserId('u1');
    expect(sessions.map(s => s.id).sort()).toEqual([publicSessionId('a'), publicSessionId('b')].sort());
    expect(sessions.find(s => s.id === publicSessionId('a'))).toMatchObject({ userAgent: 'Firefox', loginAt: 5 });
    expect(publicSessionId('a')).not.toContain('a'.repeat(2));

    expect(await store.destroyOne('u2', publicSessionId('a'))).toBeNull();
    expect(await store.destroyOne('u1', publicSessionId('a'))).toMatchObject({ accessToken: 't1' });
    expect(await promisify(store, 'get', 'a')).toBeNull();
    expect(await promisify(store, 'get', 'b')).not.toBeNull();
  });

  it('names every user with a live session', async () => {
    clock = 1_000_000;
    const store = createStore();
    await promisify(store, 'set', 'a', { cookie: {}, userId: 'u1' });
    await promisify(store, 'set', 'b', { cookie: {}, userId: 'u1' });
    await promisify(store, 'set', 'c', { cookie: {}, userId: 'u2' });
    await promisify(store, 'set', 'd', { cookie: {} });
    expect(await store.liveUserIds()).toEqual(new Set(['u1', 'u2']));
  });

  it('ends every session of one user and hands back their data', async () => {
    clock = 1_000_000;
    const store = createStore();
    await promisify(store, 'set', 'a', { cookie: {}, userId: 'u1', accessToken: 't1' });
    await promisify(store, 'set', 'b', { cookie: {}, userId: 'u2', accessToken: 't2' });
    await promisify(store, 'set', 'c', { cookie: {}, userId: 'u1', accessToken: 't3' });

    const removed = await store.destroyByUserId('u1');

    expect(removed.map(sess => sess.accessToken).sort()).toEqual(['t1', 't3']);
    expect(await promisify(store, 'get', 'a')).toBeNull();
    expect(await promisify(store, 'get', 'c')).toBeNull();
    expect(await promisify(store, 'get', 'b')).not.toBeNull();
    expect(await store.destroyByUserId(null)).toEqual([]);
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

  it('lists only live sessions and ends all others in one pass', async () => {
    clock = 1_000_000;
    const store = createStore();
    await promisify(store, 'set', 'a', { cookie: {}, userId: 'u1', accessToken: 't1' });
    await promisify(store, 'set', 'b', { cookie: {}, userId: 'u1', accessToken: 't2' });
    await promisify(store, 'set', 'c', { cookie: {}, userId: 'u1', accessToken: 't3' });
    await promisify(store, 'set', 'old', { cookie: { expires: new Date(clock + 1000).toISOString() }, userId: 'u1' });
    await promisify(store, 'set', 'd', { cookie: {}, userId: 'u2' });

    clock += 2000;
    expect((await store.listByUserId('u1')).map(s => s.sid).sort()).toEqual(['a', 'b', 'c']);
    expect(await store.livePublicIds()).toEqual(new Set(['a', 'b', 'c', 'd'].map(publicSessionId)));

    const ended = await store.destroyOthers('u1', { keep: publicSessionId('a') });
    expect(ended.map(entry => entry.session.accessToken).sort()).toEqual(['t2', 't3']);
    expect(ended.map(entry => entry.id).sort()).toEqual([publicSessionId('b'), publicSessionId('c')].sort());
    expect((await store.listByUserId('u1')).map(s => s.sid)).toEqual(['a']);
    expect(await promisify(store, 'get', 'd')).not.toBeNull();
  });

  it('does not bring an ended session back through a late save', async () => {
    clock = 1_000_000;
    const store = createStore();
    await promisify(store, 'set', 'a', { cookie: {}, userId: 'u1' });
    await store.destroyOne('u1', publicSessionId('a'));
    await promisify(store, 'set', 'a', { cookie: {}, userId: 'u1', lastSeenAt: 5 });
    expect(await promisify(store, 'get', 'a')).toBeNull();

    await promisify(store, 'set', 'b', { cookie: {}, userId: 'u1' });
    await promisify(store, 'destroy', 'b');
    await promisify(store, 'set', 'b', { cookie: {}, userId: 'u1' });
    expect(await promisify(store, 'get', 'b')).toBeNull();
  });

  it('removes expired sessions on cleanup and says how many', async () => {
    clock = 1_000_000;
    const store = createStore();
    await promisify(store, 'set', 'a', { cookie: {}, userId: 'u1' });
    await store.ready;
    expect(store.cleanup()).toBe(0);
    clock += DAY + 1;
    expect(store.cleanup()).toBe(1);
  });
});
