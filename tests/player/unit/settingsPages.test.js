import { describe, it, expect, vi } from 'vitest';
import { renderEpisodesPage, renderOptionsPage, renderParticipantsPage } from '../../../src/player/src/settings/pages.js';

const flyout = () => ({ back: vi.fn(), close: vi.fn(), refresh: vi.fn() });

function episodeContext() {
  return {
    currentEpisodeId: 'ep-2',
    seasons: [{ Id: 's1', Name: 'Staffel 1' }, { Id: 's2', Name: 'Staffel 2' }],
    episodesBySeason: {
      s1: [{ Id: 'ep-1', Name: 'Pilot', ParentIndexNumber: 1, IndexNumber: 1 }, { Id: 'ep-2', Name: 'Zwei', ParentIndexNumber: 1, IndexNumber: 2 }],
      s2: [{ Id: 'ep-3', Name: 'Neu', ParentIndexNumber: 2, IndexNumber: 1 }]
    }
  };
}

describe('renderOptionsPage', () => {
  it('markiert die aktive Auswahl, übernimmt eine neue und geht zurück', () => {
    const body = document.createElement('div');
    const onSelect = vi.fn();
    const api = flyout();
    renderOptionsPage(body, {
      options: [{ id: 'off', label: 'Aus', selected: true }, { id: 'de', label: 'Deutsch', selected: false }],
      onSelect
    }, api);

    const [off, de] = body.querySelectorAll('.vanta-settings-option');
    expect(off.getAttribute('aria-checked')).toBe('true');
    expect(de.getAttribute('aria-checked')).toBe('false');

    de.click();
    expect(onSelect).toHaveBeenCalledWith('de');
    expect(api.back).toHaveBeenCalled();

    off.click();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('zeigt einen Leerzustand ohne Auswahl', () => {
    const body = document.createElement('div');
    renderOptionsPage(body, { options: [{ id: null, label: 'Keine Untertitel verfügbar', disabled: true }], onSelect: vi.fn() }, flyout());
    expect(body.querySelector('.vanta-settings-empty').textContent).toBe('Keine Untertitel verfügbar');
  });
});

describe('renderEpisodesPage', () => {
  it('öffnet die Staffel der laufenden Folge, markiert sie und wechselt per Klick', () => {
    const body = document.createElement('div');
    const onSelectEpisode = vi.fn();
    const api = flyout();
    renderEpisodesPage(body, { context: episodeContext(), readonly: false, onSelectEpisode }, api);

    expect(body.querySelector('.vanta-settings-season.is-active').textContent).toBe('Staffel 1');
    const current = body.querySelector('[data-episode-id="ep-2"]');
    expect(current.classList.contains('is-current')).toBe(true);
    expect(current.textContent).toContain('Läuft');

    current.click();
    expect(onSelectEpisode).not.toHaveBeenCalled();

    body.querySelector('[data-season-id="s2"]').click();
    body.querySelector('[data-episode-id="ep-3"]').click();
    expect(onSelectEpisode).toHaveBeenCalledWith(expect.objectContaining({ Id: 'ep-3' }));
    expect(api.close).toHaveBeenCalled();
  });

  it('lässt Zuschauer nur schauen, nicht wechseln', () => {
    const body = document.createElement('div');
    const onSelectEpisode = vi.fn();
    renderEpisodesPage(body, { context: episodeContext(), readonly: true, onSelectEpisode }, flyout());

    expect(body.querySelector('.vanta-settings-hint').textContent).toBe('Nur Admins können die Folge wechseln.');
    const other = body.querySelector('[data-episode-id="ep-1"]');
    expect(other.disabled).toBe(true);
    other.click();
    expect(onSelectEpisode).not.toHaveBeenCalled();
  });
});

describe('renderParticipantsPage', () => {
  const watchParty = (overrides = {}) => ({
    currentUserId: 'owner-1',
    participants: [
      { userId: 'owner-1', username: 'Alice', role: 'owner', connected: true },
      { userId: 'viewer-1', username: 'Bob', role: 'viewer', connected: false }
    ],
    onPromoteMember: vi.fn(),
    onBanMember: vi.fn(),
    ...overrides
  });

  it('zeigt Rolle und Verbindung und gibt Admins die passenden Aktionen', () => {
    const body = document.createElement('div');
    renderParticipantsPage(body, { watchParty: watchParty(), pendingBan: { userId: null, refresh: vi.fn() } });

    const owner = body.querySelector('[data-user-id="owner-1"]');
    expect(owner.textContent).toContain('Du');
    expect(owner.textContent).toContain('Gastgeber');
    expect(owner.querySelector('[data-action]')).toBeNull();

    const viewer = body.querySelector('[data-user-id="viewer-1"]');
    expect(viewer.querySelector('.vanta-settings-participant-status').textContent.trim()).toBe('Offline');
    expect(viewer.querySelector('[data-action="promote"]')).not.toBeNull();
    expect(viewer.querySelector('[data-action="ban"]')).not.toBeNull();
  });

  it('gibt Zuschauern keine Aktionen', () => {
    const body = document.createElement('div');
    renderParticipantsPage(body, { watchParty: watchParty({ currentUserId: 'viewer-1' }), pendingBan: { userId: null, refresh: vi.fn() } });
    expect(body.querySelectorAll('[data-action]')).toHaveLength(0);
  });

  it('befördert per Klick und bannt erst nach Bestätigung', () => {
    const party = watchParty();
    const pendingBan = { userId: null, refresh: vi.fn() };
    let body = document.createElement('div');
    renderParticipantsPage(body, { watchParty: party, pendingBan });

    body.querySelector('[data-action="promote"]').click();
    expect(party.onPromoteMember).toHaveBeenCalledWith('viewer-1');

    body.querySelector('[data-action="ban"]').click();
    expect(party.onBanMember).not.toHaveBeenCalled();
    expect(pendingBan.userId).toBe('viewer-1');
    expect(pendingBan.refresh).toHaveBeenCalled();

    body = document.createElement('div');
    renderParticipantsPage(body, { watchParty: party, pendingBan });
    const confirm = body.querySelector('[data-action="confirm-ban"]');
    expect(confirm.textContent).toBe('Wirklich bannen?');
    confirm.click();
    expect(party.onBanMember).toHaveBeenCalledWith('viewer-1');
    expect(pendingBan.userId).toBeNull();
  });
});
