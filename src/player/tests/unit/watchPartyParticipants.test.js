import { describe, it, expect, vi, beforeEach } from 'vitest';
import { canBan, canPromote, roleLabel, createWatchPartyParticipantsMenu } from '../../src/watchPartyParticipants.js';

describe('roleLabel', () => {
  it('labels owner and admin, and returns empty string for viewer', () => {
    expect(roleLabel('owner')).toBe('Owner');
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

describe('createWatchPartyParticipantsMenu', () => {
  let buttonContainer;
  let menuContainer;

  beforeEach(() => {
    buttonContainer = document.createElement('div');
    menuContainer = document.createElement('div');
    document.body.appendChild(buttonContainer);
    document.body.appendChild(menuContainer);
  });

  function baseWatchParty(overrides = {}) {
    return {
      currentUserId: 'owner-1',
      participants: [
        { userId: 'owner-1', username: 'Alice', role: 'owner', connected: true },
        { userId: 'viewer-1', username: 'Bob', role: 'viewer', connected: true }
      ],
      onPromoteMember: vi.fn(),
      onBanMember: vi.fn(),
      ...overrides
    };
  }

  it('rendert nur bei watchParty.enabled im Player-Setup, wird hier aber immer per Factory erzeugt und zeigt die Teilnehmerzahl an', () => {
    const watchParty = baseWatchParty();
    const menu = createWatchPartyParticipantsMenu({ buttonContainer, menuContainer, watchParty });

    expect(buttonContainer.querySelector('.vanta-player-participants-count').textContent).toBe('2');
    menu.destroy();
  });

  it('zeigt für den Owner "Admin machen" und "Bannen" bei einem Viewer', () => {
    const watchParty = baseWatchParty();
    const menu = createWatchPartyParticipantsMenu({ buttonContainer, menuContainer, watchParty });
    menu.open();

    const row = menuContainer.querySelector('[data-user-id="viewer-1"]');
    expect(row.querySelector('[data-action="promote"]')).not.toBeNull();
    expect(row.querySelector('[data-action="ban"]')).not.toBeNull();
    menu.destroy();
  });

  it('Viewer sieht keine Ban- oder Promote-Buttons', () => {
    const watchParty = baseWatchParty({
      currentUserId: 'viewer-1',
      participants: [
        { userId: 'owner-1', username: 'Alice', role: 'owner', connected: true },
        { userId: 'viewer-1', username: 'Bob', role: 'viewer', connected: true },
        { userId: 'viewer-2', username: 'Carl', role: 'viewer', connected: true }
      ]
    });
    const menu = createWatchPartyParticipantsMenu({ buttonContainer, menuContainer, watchParty });
    menu.open();

    expect(menuContainer.querySelectorAll('[data-action="promote"]').length).toBe(0);
    expect(menuContainer.querySelectorAll('[data-action="ban"]').length).toBe(0);
    menu.destroy();
  });

  it('Klick auf "Admin machen" ruft onPromoteMember mit der Ziel-userId auf', () => {
    const watchParty = baseWatchParty();
    const menu = createWatchPartyParticipantsMenu({ buttonContainer, menuContainer, watchParty });
    menu.open();

    menuContainer.querySelector('[data-action="promote"]').click();

    expect(watchParty.onPromoteMember).toHaveBeenCalledWith('viewer-1');
    menu.destroy();
  });

  it('Bannen braucht zwei Klicks: erst Bannen, dann Bestätigen, bevor onBanMember aufgerufen wird', () => {
    const watchParty = baseWatchParty();
    const menu = createWatchPartyParticipantsMenu({ buttonContainer, menuContainer, watchParty });
    menu.open();

    const firstClick = menuContainer.querySelector('[data-action="ban"]');
    firstClick.click();

    expect(watchParty.onBanMember).not.toHaveBeenCalled();
    const confirmButton = menuContainer.querySelector('[data-action="confirm-ban"]');
    expect(confirmButton).not.toBeNull();
    expect(confirmButton.textContent).toBe('Ban bestätigen');

    confirmButton.click();
    expect(watchParty.onBanMember).toHaveBeenCalledWith('viewer-1');
    menu.destroy();
  });

  it('watchParty.onParticipantsChange rendert die Liste neu', () => {
    const watchParty = baseWatchParty();
    const menu = createWatchPartyParticipantsMenu({ buttonContainer, menuContainer, watchParty });
    menu.open();

    watchParty.participants = [
      ...watchParty.participants,
      { userId: 'viewer-2', username: 'Carl', role: 'viewer', connected: false }
    ];
    watchParty.onParticipantsChange();

    expect(buttonContainer.querySelector('.vanta-player-participants-count').textContent).toBe('3');
    expect(menuContainer.querySelector('[data-user-id="viewer-2"]')).not.toBeNull();
    menu.destroy();
  });

  it('verkettet einen vorhandenen onParticipantsChange Callback, statt ihn zu verlieren', () => {
    const previousChange = vi.fn();
    const watchParty = baseWatchParty({ onParticipantsChange: previousChange });
    const menu = createWatchPartyParticipantsMenu({ buttonContainer, menuContainer, watchParty });
    menu.open();

    watchParty.participants = [
      ...watchParty.participants,
      { userId: 'viewer-2', username: 'Carl', role: 'viewer', connected: false }
    ];
    watchParty.onParticipantsChange();

    expect(previousChange).toHaveBeenCalled();
    expect(menuContainer.querySelector('[data-user-id="viewer-2"]')).not.toBeNull();
    menu.destroy();
  });

  it('stellt beim Destroy den vorherigen onParticipantsChange Callback wieder her', () => {
    const previousChange = vi.fn();
    const watchParty = baseWatchParty({ onParticipantsChange: previousChange });
    const menu = createWatchPartyParticipantsMenu({ buttonContainer, menuContainer, watchParty });

    menu.destroy();

    expect(watchParty.onParticipantsChange).toBe(previousChange);
  });

  it('destroy entfernt Button und Menü aus dem DOM', () => {
    const watchParty = baseWatchParty();
    const menu = createWatchPartyParticipantsMenu({ buttonContainer, menuContainer, watchParty });

    menu.destroy();

    expect(buttonContainer.querySelector('.vanta-player-participants-button')).toBeNull();
    expect(menuContainer.querySelector('.vanta-player-participants-menu')).toBeNull();
  });
});
