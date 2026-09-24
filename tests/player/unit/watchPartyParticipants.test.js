import { describe, it, expect } from 'vitest';
import { canBan, canDemote, canPromote, roleLabel } from '../../../src/player/src/watchPartyParticipants.js';

describe('roleLabel', () => {
  it('labels owner and admin, and returns empty string for viewer', () => {
    expect(roleLabel('owner')).toBe('Gastgeber');
    expect(roleLabel('admin')).toBe('Admin');
    expect(roleLabel('viewer')).toBe('');
  });
});

describe('canPromote', () => {
  it('erlaubt Owner/Admin, einen Viewer zu befördern', () => {
    expect(canPromote({ viewerRole: 'owner', member: { userId: 'u2', role: 'viewer' }, currentUserId: 'u1' })).toBe(true);
    expect(canPromote({ viewerRole: 'admin', member: { userId: 'u2', role: 'viewer' }, currentUserId: 'u1' })).toBe(true);
  });

  it('verbietet Viewern das Befördern', () => {
    expect(canPromote({ viewerRole: 'viewer', member: { userId: 'u2', role: 'viewer' }, currentUserId: 'u1' })).toBe(false);
  });

  it('verbietet sich selbst zu befördern und bereits beförderte Mitglieder erneut zu befördern', () => {
    expect(canPromote({ viewerRole: 'owner', member: { userId: 'u1', role: 'viewer' }, currentUserId: 'u1' })).toBe(false);
    expect(canPromote({ viewerRole: 'owner', member: { userId: 'u2', role: 'admin' }, currentUserId: 'u1' })).toBe(false);
    expect(canPromote({ viewerRole: 'owner', member: { userId: 'u2', role: 'owner' }, currentUserId: 'u1' })).toBe(false);
  });
});

describe('canBan', () => {
  it('erlaubt Owner und Admin, einen Viewer zu bannen', () => {
    expect(canBan({ viewerRole: 'owner', member: { userId: 'u2', role: 'viewer' }, currentUserId: 'u1' })).toBe(true);
    expect(canBan({ viewerRole: 'admin', member: { userId: 'u2', role: 'viewer' }, currentUserId: 'u1' })).toBe(true);
  });

  it('verbietet Viewern das Bannen', () => {
    expect(canBan({ viewerRole: 'viewer', member: { userId: 'u2', role: 'viewer' }, currentUserId: 'u1' })).toBe(false);
  });

  it('verbietet, sich selbst oder den Owner zu bannen', () => {
    expect(canBan({ viewerRole: 'owner', member: { userId: 'u1', role: 'viewer' }, currentUserId: 'u1' })).toBe(false);
    expect(canBan({ viewerRole: 'admin', member: { userId: 'u2', role: 'owner' }, currentUserId: 'u1' })).toBe(false);
  });

  it('nur der Owner darf einen anderen Admin bannen', () => {
    expect(canBan({ viewerRole: 'admin', member: { userId: 'u2', role: 'admin' }, currentUserId: 'u1' })).toBe(false);
    expect(canBan({ viewerRole: 'owner', member: { userId: 'u2', role: 'admin' }, currentUserId: 'u1' })).toBe(true);
  });
});

describe('canDemote', () => {
  it('erlaubt nur dem Gastgeber, anderen Admins die Rechte zu entziehen', () => {
    expect(canDemote({ viewerRole: 'owner', member: { userId: 'u2', role: 'admin' }, currentUserId: 'u1' })).toBe(true);
    expect(canDemote({ viewerRole: 'admin', member: { userId: 'u2', role: 'admin' }, currentUserId: 'u1' })).toBe(false);
    expect(canDemote({ viewerRole: 'owner', member: { userId: 'u2', role: 'viewer' }, currentUserId: 'u1' })).toBe(false);
    expect(canDemote({ viewerRole: 'owner', member: { userId: 'u1', role: 'owner' }, currentUserId: 'u1' })).toBe(false);
  });
});
