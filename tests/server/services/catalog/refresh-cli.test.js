import { describe, it, expect, vi } from 'vitest';
import { runRefresh } from '../../../../src/server/services/catalog/refresh-cli.js';

const RECORD = { type: 'update', added: 1, updated: 0, removed: 0, durationMs: 300, error: null, library: { movies: 5, series: 2, episodes: 40 } };

const jsonResponse = (status, body) => ({ status, json: async () => body });
const refused = () => Object.assign(new Error('fetch failed'), { cause: { code: 'ECONNREFUSED' } });

describe('runRefresh', () => {
  it('asks a running server and prints its result', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, RECORD));
    const runLocal = vi.fn();
    const lines = [];

    const record = await runRefresh({ port: 3000, apiKey: 'k', fetchImpl, runLocal, print: line => lines.push(line) });

    expect(record).toEqual(RECORD);
    expect(fetchImpl).toHaveBeenCalledWith('http://127.0.0.1:3000/api/internal/catalog/refresh', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'X-Vanta-Key': 'k' }),
      body: JSON.stringify({ full: false })
    }));
    expect(runLocal).not.toHaveBeenCalled();
    expect(lines).toEqual([
      'Läuft über den Server auf Port 3000.',
      '[Catalog] Update: 1 neu (300 ms)',
      '[Catalog] Bibliothek: 5 Filme, 2 Serien, 40 Folgen'
    ]);
  });

  it('passes --full through to the server', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { ...RECORD, type: 'full' }));

    await runRefresh({ full: true, port: 3000, apiKey: 'k', fetchImpl, runLocal: vi.fn(), print: () => {} });

    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual({ full: true });
  });

  it('syncs in-process when no server answers', async () => {
    const fetchImpl = vi.fn(async () => { throw refused(); });
    const runLocal = vi.fn(async () => ({ ...RECORD, type: 'full', removed: 2 }));
    const lines = [];

    const record = await runRefresh({ full: true, port: 3000, apiKey: 'k', fetchImpl, runLocal, print: line => lines.push(line) });

    expect(runLocal).toHaveBeenCalledWith({ full: true });
    expect(record.removed).toBe(2);
    expect(lines[0]).toBe('Kein Server auf Port 3000 — synchronisiere direkt.');
    expect(lines[1]).toBe('[Catalog] Vollabgleich: 1 neu, 2 entfernt (300 ms)');
  });

  it('does not fall back to a local sync when the server rejects the call', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(401, { error: 'Ungültiger Schlüssel' }));
    const runLocal = vi.fn();

    await expect(runRefresh({ port: 3000, apiKey: 'k', fetchImpl, runLocal, print: () => {} }))
      .rejects.toThrow(/abgelehnt \(401\): Ungültiger Schlüssel/);
    expect(runLocal).not.toHaveBeenCalled();
  });

  it('reports a failed run instead of a summary', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(502, { ...RECORD, error: 'jellyfin down' }));
    const lines = [];

    const record = await runRefresh({ port: 3000, apiKey: 'k', fetchImpl, runLocal: vi.fn(), print: line => lines.push(line) });

    expect(record.error).toBe('jellyfin down');
    expect(lines).toContain('[Catalog] Update fehlgeschlagen: jellyfin down');
  });

  it('propagates other network errors', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('timeout'); });

    await expect(runRefresh({ port: 3000, apiKey: 'k', fetchImpl, runLocal: vi.fn(), print: () => {} })).rejects.toThrow('timeout');
  });
});
