import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import { join } from 'path';
import { createUserBanService } from './user-ban.service.js';

describe('UserBanService', () => {
  let dbDir;
  let service;

  beforeEach(() => {
    dbDir = fs.mkdtempSync(join(os.tmpdir(), 'vanta-user-ban-'));
    service = createUserBanService({ dbDir });
  });

  afterEach(() => {
    fs.rmSync(dbDir, { recursive: true, force: true });
  });

  it('returns an empty list when no banned.json exists yet', () => {
    expect(service.getAll()).toEqual([]);
    expect(service.getBan('user-1')).toBeNull();
    expect(service.isBanned('user-1')).toBe(false);
  });

  it('creates db/user/ on demand when banning a user', () => {
    expect(fs.existsSync(dbDir)).toBe(true);
    fs.rmSync(dbDir, { recursive: true, force: true });

    service.ban('user-1', 'alice', 'Account geteilt', { userId: 'admin-1', username: 'admin' });

    expect(fs.existsSync(join(dbDir, 'banned.json'))).toBe(true);
  });

  it('bans a user with a required reason and persists it', () => {
    const entry = service.ban('user-1', 'alice', 'Account geteilt', { userId: 'admin-1', username: 'admin' });

    expect(entry.userId).toBe('user-1');
    expect(entry.username).toBe('alice');
    expect(entry.reason).toBe('Account geteilt');
    expect(entry.bannedBy).toEqual({ userId: 'admin-1', username: 'admin' });
    expect(entry.bannedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    expect(service.isBanned('user-1')).toBe(true);
    expect(service.getBan('user-1').reason).toBe('Account geteilt');
  });

  it('rejects a ban with an empty or whitespace-only reason', () => {
    expect(() => service.ban('user-1', 'alice', '')).toThrow(/reason/i);
    expect(() => service.ban('user-1', 'alice', '   ')).toThrow(/reason/i);
    expect(service.isBanned('user-1')).toBe(false);
  });

  it('rejects a ban without a userId', () => {
    expect(() => service.ban(null, 'alice', 'reason')).toThrow(/userId/i);
  });

  it('overwrites an existing ban entry for the same userId instead of duplicating it', () => {
    service.ban('user-1', 'alice', 'first reason');
    service.ban('user-1', 'alice', 'second reason');

    expect(service.getAll()).toHaveLength(1);
    expect(service.getBan('user-1').reason).toBe('second reason');
  });

  it('unban removes the entry entirely', () => {
    service.ban('user-1', 'alice', 'Account geteilt');
    expect(service.isBanned('user-1')).toBe(true);

    const changed = service.unban('user-1');

    expect(changed).toBe(true);
    expect(service.isBanned('user-1')).toBe(false);
    expect(service.getAll()).toEqual([]);
  });

  it('unban is a no-op returning false when the user was never banned', () => {
    expect(service.unban('never-banned')).toBe(false);
  });

  it('falls back to an empty list instead of crashing on a corrupted banned.json', () => {
    fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(join(dbDir, 'banned.json'), '{ not valid json', 'utf8');

    expect(service.getAll()).toEqual([]);
    expect(service.isBanned('user-1')).toBe(false);
  });

  it('falls back to an empty list when banned.json has an unexpected shape', () => {
    fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(join(dbDir, 'banned.json'), JSON.stringify({ users: 'not-an-array' }), 'utf8');

    expect(service.getAll()).toEqual([]);
  });
});
