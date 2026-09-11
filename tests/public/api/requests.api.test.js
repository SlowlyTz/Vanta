import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RequestsApi } from '../../../src/public/js/api/requests.api.js';

function createJsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body)
  });
}

// The client stringifies the body before handing it to fetch, so every body
// assertion goes through the wire format the server actually parses.
const sentBody = (call = 0) => JSON.parse(fetch.mock.calls[call][1].body);
const sentUrl = (call = 0) => fetch.mock.calls[call][0];
const sentOptions = (call = 0) => fetch.mock.calls[call][1];

describe('RequestsApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    fetch.mockReset();
    fetch.mockReturnValue(createJsonResponse({}));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('search', () => {
    it('fragt den Suchendpunkt per GET ab', async () => {
      await RequestsApi.search('dune');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(sentUrl()).toBe('/api/requests/search?q=dune');
      expect(sentOptions().method).toBeUndefined();
    });

    it('kodiert die Suchanfrage', async () => {
      await RequestsApi.search('herr der ringe & co');

      expect(sentUrl()).toBe('/api/requests/search?q=herr%20der%20ringe%20%26%20co');
    });

    it('gibt die geparste Antwort zurück', async () => {
      const body = [{ id: 1, media_type: 'tv' }];
      fetch.mockReturnValue(createJsonResponse(body));

      await expect(RequestsApi.search('dune')).resolves.toEqual(body);
    });
  });

  describe('getDetails', () => {
    it('sendet tmdbId und tmdbType als Query-Parameter', async () => {
      await RequestsApi.getDetails(42, 'tv');

      expect(sentUrl()).toBe('/api/requests/details?tmdbId=42&tmdbType=tv');
      expect(sentOptions().method).toBeUndefined();
    });
  });

  describe('crossCheck', () => {
    it('sendet POST mit tmdbId und tmdbType im Body', async () => {
      await RequestsApi.crossCheck(42, 'tv');

      expect(sentUrl()).toBe('/api/requests/cross-check');
      expect(sentOptions().method).toBe('POST');
      // GET /cross-check destructures exactly { tmdbId, tmdbType } from req.body.
      expect(sentBody()).toEqual({ tmdbId: 42, tmdbType: 'tv' });
    });
  });

  describe('createRequest', () => {
    it('sendet POST /api/requests ohne Scope-Schlüssel, wenn nichts ausgewählt ist', async () => {
      await RequestsApi.createRequest(42, 'tv', 'bitte');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(sentUrl()).toBe('/api/requests');
      expect(sentOptions().method).toBe('POST');

      const body = sentBody();
      expect(body).toEqual({ tmdbId: 42, tmdbType: 'tv', note: 'bitte' });
      // The server defaults scope to 'all'; the client must not invent the key.
      expect(Object.keys(body)).toEqual(['tmdbId', 'tmdbType', 'note']);
      expect(body).not.toHaveProperty('scope');
      expect(body).not.toHaveProperty('seasonNumber');
      expect(body).not.toHaveProperty('episodeNumber');
    });

    it('schickt eine leere Notiz, wenn keine übergeben wird', async () => {
      await RequestsApi.createRequest(42, 'movie');

      expect(sentBody()).toEqual({ tmdbId: 42, tmdbType: 'movie', note: '' });
    });

    it('sendet scope und seasonNumber unter genau diesen Schlüsselnamen', async () => {
      await RequestsApi.createRequest(42, 'tv', '', { scope: 'season', seasonNumber: 2 });

      expect(sentUrl()).toBe('/api/requests');
      expect(sentOptions().method).toBe('POST');

      const body = sentBody();
      // Contract with src/server/routes/requests.routes.js, which destructures
      // { tmdbId, tmdbType, note, scope, seasonNumber, episodeNumber } from req.body.
      expect(body).toEqual({ tmdbId: 42, tmdbType: 'tv', note: '', scope: 'season', seasonNumber: 2 });
      expect(body.seasonNumber).toBe(2);
      expect(body).not.toHaveProperty('season');
      expect(body).not.toHaveProperty('season_number');
      expect(body).not.toHaveProperty('episodeNumber');
    });

    it('sendet scope, seasonNumber und episodeNumber für eine einzelne Folge', async () => {
      await RequestsApi.createRequest(42, 'tv', 'note', { scope: 'episode', seasonNumber: 2, episodeNumber: 5 });

      const body = sentBody();
      expect(body).toEqual({
        tmdbId: 42,
        tmdbType: 'tv',
        note: 'note',
        scope: 'episode',
        seasonNumber: 2,
        episodeNumber: 5
      });
      expect(body.episodeNumber).toBe(5);
      expect(body).not.toHaveProperty('episode');
      expect(body).not.toHaveProperty('episode_number');
    });

    it('sendet scope all ohne Staffel- und Folgenschlüssel', async () => {
      await RequestsApi.createRequest(42, 'tv', '', { scope: 'all' });

      expect(sentBody()).toEqual({ tmdbId: 42, tmdbType: 'tv', note: '', scope: 'all' });
    });

    it('behält die Staffel 0, damit der Server die Specials selbst ablehnen kann', async () => {
      await RequestsApi.createRequest(42, 'tv', '', { scope: 'season', seasonNumber: 0 });

      expect(sentBody()).toEqual({ tmdbId: 42, tmdbType: 'tv', note: '', scope: 'season', seasonNumber: 0 });
    });

    it('lässt null-Werte für Staffel und Folge weg', async () => {
      await RequestsApi.createRequest(42, 'tv', '', { scope: 'all', seasonNumber: null, episodeNumber: null });

      expect(sentBody()).toEqual({ tmdbId: 42, tmdbType: 'tv', note: '', scope: 'all' });
    });

    it('setzt den JSON-Content-Type', async () => {
      await RequestsApi.createRequest(42, 'tv', '', { scope: 'season', seasonNumber: 1 });

      expect(sentOptions().headers['Content-Type']).toBe('application/json');
    });
  });

  describe('getSeason', () => {
    it('fragt /api/requests/season mit tmdbId und seasonNumber ab', async () => {
      await RequestsApi.getSeason(42, 2);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(sentUrl()).toBe('/api/requests/season?tmdbId=42&seasonNumber=2');
      expect(sentOptions().method).toBeUndefined();
    });

    it('kodiert beide Query-Parameter', async () => {
      await RequestsApi.getSeason('42/x', '2 &3');

      expect(sentUrl()).toBe('/api/requests/season?tmdbId=42%2Fx&seasonNumber=2%20%263');
    });

    it('gibt die Folgenliste zurück', async () => {
      const body = { season_number: 2, name: 'Staffel 2', episodes: [{ episode_number: 1, name: 'Pilot' }] };
      fetch.mockReturnValue(createJsonResponse(body));

      await expect(RequestsApi.getSeason(42, 2)).resolves.toEqual(body);
    });
  });

  describe('Listen-Endpunkte', () => {
    it('getMyRequests fragt GET /api/requests ab', async () => {
      await RequestsApi.getMyRequests();

      expect(sentUrl()).toBe('/api/requests');
      expect(sentOptions().method).toBeUndefined();
    });

    it('getOpenRequests fragt GET /api/requests/admin/open ab', async () => {
      await RequestsApi.getOpenRequests();

      expect(sentUrl()).toBe('/api/requests/admin/open');
      expect(sentOptions().method).toBeUndefined();
    });

    it('getAllRequests fragt GET /api/requests/admin/all ab', async () => {
      await RequestsApi.getAllRequests();

      expect(sentUrl()).toBe('/api/requests/admin/all');
      expect(sentOptions().method).toBeUndefined();
    });
  });

  describe('Admin-Aktionen', () => {
    it('approveRequest sendet POST an den approve-Endpunkt', async () => {
      await RequestsApi.approveRequest('req-1');

      expect(sentUrl()).toBe('/api/requests/req-1/approve');
      expect(sentOptions().method).toBe('POST');
    });

    it('rejectRequest sendet POST an den reject-Endpunkt', async () => {
      await RequestsApi.rejectRequest('req-1');

      expect(sentUrl()).toBe('/api/requests/req-1/reject');
      expect(sentOptions().method).toBe('POST');
    });

    it('deleteRequest sendet DELETE', async () => {
      await RequestsApi.deleteRequest('req-1');

      expect(sentUrl()).toBe('/api/requests/req-1');
      expect(sentOptions().method).toBe('DELETE');
    });
  });

  describe('Fehlerpfad', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('lehnt bei einer 409-Antwort mit der Servermeldung ab', async () => {
      fetch.mockReturnValue(createJsonResponse({ error: 'Bereits angefragt' }, 409));

      await expect(RequestsApi.createRequest(42, 'tv', '', { scope: 'season', seasonNumber: 2 }))
        .rejects.toMatchObject({ message: 'Bereits angefragt', status: 409, isAuthError: false });
    });

    it('lehnt mit einer Standardmeldung ab, wenn der Server kein JSON liefert', async () => {
      fetch.mockReturnValue(Promise.resolve({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'text/html' }),
        json: () => Promise.reject(new Error('not json'))
      }));

      await expect(RequestsApi.getSeason(42, 2))
        .rejects.toMatchObject({ message: 'Request failed with status 500', status: 500 });
    });

    it('markiert eine 401-Antwort als isAuthError und leitet zum Login', async () => {
      window.location.hash = '#/requests';
      fetch.mockReturnValue(createJsonResponse({ error: 'Unauthorized' }, 401));

      await expect(RequestsApi.getSeason(42, 2))
        .rejects.toMatchObject({ isAuthError: true, silent: true, status: 401 });

      expect(window.location.hash).toBe('#/login');
    });
  });
});
