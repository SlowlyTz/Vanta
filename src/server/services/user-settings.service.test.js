import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import { join } from 'path';
import { createUserSettingsService, DEFAULT_MAX_CONCURRENT_STREAMS } from './user-settings.service.js';

describe('UserSettingsService', () => {
  let dbDir;
  let service;

  beforeEach(() => {
    dbDir = fs.mkdtempSync(join(os.tmpdir(), 'vanta-user-settings-'));
    service = createUserSettingsService({ dbDir });
  });

  afterEach(() => {
    fs.rmSync(dbDir, { recursive: true, force: true });
  });

  it('defaults maxConcurrentStreams to 1 when no settings.json exists', () => {
    expect(DEFAULT_MAX_CONCURRENT_STREAMS).toBe(1);
    expect(service.getMaxConcurrentStreams('user-1')).toBe(1);
    expect(service.getSettings('user-1')).toEqual({ maxConcurrentStreams: 1 });
  });

  it('creates db/user/ on demand when writing settings', () => {
    fs.rmSync(dbDir, { recursive: true, force: true });

    service.setMaxConcurrentStreams('user-1', 2, { userId: 'admin-1', username: 'admin' });

    expect(fs.existsSync(join(dbDir, 'settings.json'))).toBe(true);
  });

  it('persists a custom limit and returns it on subsequent reads', () => {
    const entry = service.setMaxConcurrentStreams('user-1', 3, { userId: 'admin-1', username: 'admin' });

    expect(entry.maxConcurrentStreams).toBe(3);
    expect(entry.updatedBy).toEqual({ userId: 'admin-1', username: 'admin' });
    expect(entry.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    expect(service.getMaxConcurrentStreams('user-1')).toBe(3);
  });

  it('allows 0 to mean no streaming permitted', () => {
    service.setMaxConcurrentStreams('user-1', 0);
    expect(service.getMaxConcurrentStreams('user-1')).toBe(0);
  });

  it('rejects negative, non-integer or out-of-range values', () => {
    expect(() => service.setMaxConcurrentStreams('user-1', -1)).toThrow();
    expect(() => service.setMaxConcurrentStreams('user-1', 1.5)).toThrow();
    expect(() => service.setMaxConcurrentStreams('user-1', 21)).toThrow();
    expect(() => service.setMaxConcurrentStreams('user-1', 'two')).toThrow();
  });

  it('rejects writes without a userId', () => {
    expect(() => service.setMaxConcurrentStreams(null, 1)).toThrow(/userId/i);
  });

  it('does not affect settings for other users', () => {
    service.setMaxConcurrentStreams('user-1', 5);
    expect(service.getMaxConcurrentStreams('user-2')).toBe(DEFAULT_MAX_CONCURRENT_STREAMS);
  });

  it('falls back to the default instead of crashing on a corrupted settings.json', () => {
    fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(join(dbDir, 'settings.json'), '{ not valid json', 'utf8');

    expect(service.getMaxConcurrentStreams('user-1')).toBe(DEFAULT_MAX_CONCURRENT_STREAMS);
  });

  it('falls back to the default when a stored value is invalid', () => {
    fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(
      join(dbDir, 'settings.json'),
      JSON.stringify({ users: { 'user-1': { maxConcurrentStreams: -5 } } }),
      'utf8'
    );

    expect(service.getMaxConcurrentStreams('user-1')).toBe(DEFAULT_MAX_CONCURRENT_STREAMS);
  });
});
