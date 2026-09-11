import { describe, it, expect, vi, afterEach } from 'vitest';
import initSqlJs from 'sql.js';
import fs from 'fs';
import os from 'os';
import { join } from 'path';
import { createCatalogDb, openCatalogDb } from '../../../src/server/db/catalog.js';

const SQL = await initSqlJs();
const tempFiles = [];

const tempFile = () => {
  const file = join(fs.mkdtempSync(join(os.tmpdir(), 'vanta-catalog-')), 'catalog.db');
  tempFiles.push(file);
  return file;
};

afterEach(() => {
  for (const file of tempFiles.splice(0)) fs.rmSync(join(file, '..'), { recursive: true, force: true });
});

describe('createCatalogDb', () => {
  it('creates the catalogue tables', () => {
    const db = createCatalogDb({ SQL });
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map(r => r.name);

    expect(tables).toEqual(['catalog_item_genres', 'catalog_item_studios', 'catalog_items', 'catalog_libraries', 'catalog_meta']);
  });

  it('does not write to disk on a plain run', () => {
    const file = tempFile();
    const db = createCatalogDb({ SQL, file });

    db.prepare('INSERT INTO catalog_meta (key, value) VALUES (?, ?)').run('a', '1');

    expect(fs.existsSync(file)).toBe(false);
  });

  it('persists once after a successful transaction', () => {
    const file = tempFile();
    const db = createCatalogDb({ SQL, file });
    const write = vi.spyOn(fs, 'writeFileSync');

    db.transaction(() => {
      const insert = db.prepare('INSERT INTO catalog_meta (key, value) VALUES (?, ?)');
      insert.run('a', '1');
      insert.run('b', '2');
    });

    expect(write).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(file)).toBe(true);
    write.mockRestore();
  });

  it('rolls back and does not persist when the transaction throws', () => {
    const file = tempFile();
    const db = createCatalogDb({ SQL, file });

    expect(() => db.transaction(() => {
      db.prepare('INSERT INTO catalog_meta (key, value) VALUES (?, ?)').run('a', '1');
      throw new Error('boom');
    })).toThrow('boom');

    expect(db.prepare('SELECT COUNT(*) n FROM catalog_meta').get().n).toBe(0);
    expect(fs.existsSync(file)).toBe(false);
  });

  it('reopens a persisted catalogue with its data', async () => {
    const file = tempFile();
    const db = createCatalogDb({ SQL, file });
    db.transaction(() => db.prepare('INSERT INTO catalog_meta (key, value) VALUES (?, ?)').run('a', '1'));

    const reopened = await openCatalogDb(file);
    expect(reopened.prepare('SELECT value FROM catalog_meta WHERE key = ?').get('a').value).toBe('1');
  });

  it('accepts a single array as bound parameters', () => {
    const db = createCatalogDb({ SQL });
    db.prepare('INSERT INTO catalog_meta (key, value) VALUES (?, ?)').run(['k', 'v']);

    expect(db.prepare('SELECT value FROM catalog_meta WHERE key = ?').get(['k']).value).toBe('v');
  });
});
