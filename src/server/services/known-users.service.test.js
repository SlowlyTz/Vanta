import { describe, it, expect, beforeEach } from 'vitest';
import { KnownUsersService } from './known-users.service.js';

describe('KnownUsersService', () => {
  beforeEach(() => {
    KnownUsersService.usersById.clear();
    KnownUsersService.userIdByNormalizedName.clear();
  });

  it('speichert userId, username, normalizedUsername und lastSeenAt', () => {
    const entry = KnownUsersService.remember({ userId: 'user-1', username: 'Alice' });

    expect(entry).toMatchObject({
      userId: 'user-1',
      username: 'Alice',
      normalizedUsername: 'alice'
    });
    expect(entry.lastSeenAt).toBeLessThanOrEqual(Date.now());
  });

  it('aktualisiert bestehende Einträge bei erneutem remember', () => {
    KnownUsersService.remember({ userId: 'user-1', username: 'Alice' });
    KnownUsersService.remember({ userId: 'user-1', username: 'AliceNew' });

    const entry = KnownUsersService.findByExactUsername('AliceNew');
    expect(entry.userId).toBe('user-1');
    expect(KnownUsersService.usersById.size).toBe(1);
  });

  it('findByExactUsername matched case-insensitive nach trim', () => {
    KnownUsersService.remember({ userId: 'user-1', username: 'Alice' });

    expect(KnownUsersService.findByExactUsername('alice')).toMatchObject({ userId: 'user-1' });
    expect(KnownUsersService.findByExactUsername('ALICE')).toMatchObject({ userId: 'user-1' });
    expect(KnownUsersService.findByExactUsername('  Alice  ')).toMatchObject({ userId: 'user-1' });
  });

  it('liefert keine Teiltreffer', () => {
    KnownUsersService.remember({ userId: 'user-1', username: 'Alice' });

    expect(KnownUsersService.findByExactUsername('Ali')).toBeNull();
    expect(KnownUsersService.findByExactUsername('Alicee')).toBeNull();
  });

  it('liefert null für unbekannte Usernamen', () => {
    expect(KnownUsersService.findByExactUsername('unknown')).toBeNull();
  });

  it('ignoriert remember ohne userId oder username', () => {
    expect(KnownUsersService.remember({ userId: null, username: 'Alice' })).toBeNull();
    expect(KnownUsersService.remember({ userId: 'user-1', username: '' })).toBeNull();
    expect(KnownUsersService.usersById.size).toBe(0);
  });
});
