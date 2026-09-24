import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeWs } from './helpers.js';

vi.mock('../../../../src/server/config/session.js', () => ({ sessionMiddleware: (req, res, next) => next() }));
vi.mock('../../../../src/server/services/jellyfin/items.service.js', () => ({
  ItemsService: { getItemDetails: vi.fn(), getSeasons: vi.fn(), getEpisodes: vi.fn() }
}));

import { ItemsService } from '../../../../src/server/services/jellyfin/items.service.js';
import { WatchPartyService } from '../../../../src/server/services/watch-party.service.js';
import { WatchPartySocketHub } from '../../../../src/server/realtime/watch-party.socket.js';
import { EPISODE_START_LEAD_MS, MAX_SWITCH_WAIT_MS } from '../../../../src/server/realtime/watch-party/episodeSwitch.js';

function setup() {
  const party = {
    id: 'wp', ownerUserId: 'owner', status: 'playing', itemId: 'ep-1', playableItemId: 'ep-1',
    itemSnapshot: { name: 'Folge 1' }, positionMs: 1_200_000, lastServerTimeMs: Date.now(), seq: 3,
    members: new Map([
      ['owner', { userId: 'owner', username: 'Emilio', role: 'owner', connected: true }],
      ['lena', { userId: 'lena', username: 'Lena', role: 'admin', connected: true }],
      ['tom', { userId: 'tom', username: 'Tom', role: 'viewer', connected: true }]
    ])
  };
  WatchPartyService.parties.set('wp', party);
  const hub = new WatchPartySocketHub();
  const ws = createFakeWs();
  hub.registerConnection('wp', 'tom', ws);
  const send = (userId, message) => {
    const own = createFakeWs();
    hub.handleMessage({ partyId: 'wp', user: { userId, username: userId, accessToken: 't' }, message, ws: own });
    return own;
  };
  const flush = () => new Promise(resolve => setImmediate(resolve));
  return { party, hub, ws, send, flush };
}

describe('Folgenwechsel in der Watch Party', () => {
  beforeEach(() => {
    ItemsService.getItemDetails.mockReset().mockImplementation(async (userId, token, itemId) => ({ Id: itemId, Name: 'Folge 2', Type: 'Episode' }));
  });
  afterEach(() => {
    vi.useRealTimers();
    WatchPartyService.parties.delete('wp');
  });

  it('wechselt nur einmal, auch wenn mehrere Admins gleichzeitig „weiter“ schicken', async () => {
    const { party, ws, send, flush } = setup();
    send('owner', { type: 'OWNER_CHANGE_EPISODE', itemId: 'ep-2' });
    send('lena', { type: 'OWNER_CHANGE_EPISODE', itemId: 'ep-2' });
    await flush();
    send('lena', { type: 'OWNER_CHANGE_EPISODE', itemId: 'ep-2' });
    await flush();

    expect(ItemsService.getItemDetails).toHaveBeenCalledTimes(1);
    expect(party.status).toBe('switching');
    expect(ws.sent.filter(m => m.type === 'LOAD_MEDIA')).toEqual([
      expect.objectContaining({ itemId: 'ep-2', positionMs: 0, reason: 'episode-change' })
    ]);
  });

  it('lässt Zuschauer nicht wechseln', async () => {
    const { party, send, flush } = setup();
    const own = send('tom', { type: 'OWNER_CHANGE_EPISODE', itemId: 'ep-2' });
    await flush();
    expect(party.playableItemId).toBe('ep-1');
    expect(own.sent).toEqual([]);
  });

  it('startet ohne Countdown, sobald alle Verbundenen bereit sind, kurz in der Zukunft', async () => {
    const { party, ws, send, flush } = setup();
    party.members.get('tom').connected = false;
    send('owner', { type: 'OWNER_CHANGE_EPISODE', itemId: 'ep-2' });
    await flush();

    send('owner', { type: 'PLAYER_READY' });
    expect(party.status).toBe('switching');
    send('lena', { type: 'PLAYER_READY' });

    expect(party.status).toBe('playing');
    expect(ws.sent.some(m => m.type === 'COUNTDOWN')).toBe(false);
    const start = ws.sent.filter(m => m.type === 'TIMELINE').at(-1);
    expect(start.reason).toBe('episode-start');
    expect(start.timeline).toMatchObject({ positionMs: 0, playing: true });
    expect(start.timeline.anchorServerTimeMs - Date.now()).toBeGreaterThan(EPISODE_START_LEAD_MS - 50);
  });

  it('wartet höchstens 20 s und startet dann ohne die Langsamen', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const { party, send, flush } = setup();
    send('owner', { type: 'OWNER_CHANGE_EPISODE', itemId: 'ep-2' });
    await flush();
    send('owner', { type: 'PLAYER_READY' });

    vi.advanceTimersByTime(MAX_SWITCH_WAIT_MS - 1);
    expect(party.status).toBe('switching');
    vi.advanceTimersByTime(1);
    expect(party.status).toBe('playing');
  });

  it('wartet nicht auf jemanden, der während des Ladens geht', async () => {
    const { party, hub, send, flush } = setup();
    send('owner', { type: 'OWNER_CHANGE_EPISODE', itemId: 'ep-2' });
    await flush();
    send('owner', { type: 'PLAYER_READY' });
    send('lena', { type: 'PLAYER_READY' });
    expect(party.status).toBe('switching');

    party.members.get('tom').connected = false;
    hub.startEpisodeIfReady('wp');
    expect(party.status).toBe('playing');
  });

  it('schließt das Popup bei allen, wenn ein Admin abbricht – Zuschauer dürfen das nicht', () => {
    const { party, ws, send } = setup();
    const denied = send('tom', { type: 'NEXT_EPISODE_CANCEL' });
    expect(denied.sent).toEqual([expect.objectContaining({ type: 'ERROR' })]);
    expect(party.nextEpisodeCancelledFor).toBeUndefined();

    send('lena', { type: 'NEXT_EPISODE_CANCEL' });
    expect(party.nextEpisodeCancelledFor).toBe('ep-1');
    expect(ws.sent).toContainEqual({ type: 'NEXT_EPISODE_CANCELLED', itemId: 'ep-1' });
    const note = ws.sent.find(m => m.type === 'NOTIFICATION');
    expect(note.notification.message).toBe('Lena hat die nächste Folge abgebrochen.');
  });
});
