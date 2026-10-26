import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createJsonStore } from '../../../src/server/utils/jsonStore.js';

const dirs = [];
const tempFile = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vanta-json-'));
  dirs.push(dir);
  return path.join(dir, 'store.json');
};

describe('createJsonStore', () => {
  afterEach(() => dirs.splice(0).forEach(dir => fs.rmSync(dir, { recursive: true, force: true })));

  it('answers the empty value without a file and keeps what it writes', () => {
    const store = createJsonStore(tempFile(), { empty: () => ({ users: [] }) });
    expect(store.read()).toEqual({ users: [] });
    store.write({ users: ['a'] });
    expect(store.read()).toEqual({ users: ['a'] });
  });

  it('reads an edit by hand and parses only when the file changed', () => {
    const file = tempFile();
    let parses = 0;
    const store = createJsonStore(file, { empty: () => ({}), parse: data => { parses += 1; return data; } });
    fs.writeFileSync(file, JSON.stringify({ a: 1 }));
    expect(store.read()).toEqual({ a: 1 });
    expect(store.read()).toEqual({ a: 1 });
    expect(parses).toBe(1);
    fs.writeFileSync(file, JSON.stringify({ a: 22 }));
    expect(store.read()).toEqual({ a: 22 });
  });
});
