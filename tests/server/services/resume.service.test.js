import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMemoryDb } from '../helpers/memoryDb.js';

const memory = await createMemoryDb();
vi.mock('../../../src/server/db/database.js', () => ({ default: memory }));
vi.mock('../../../src/server/config/env.js', () => ({ default: { JELLYFIN_BASE_URL: 'http://jellyfin.test' } }));

const { createResumeService } = await import('../../../src/server/services/resume.service.js');
const { visibleResumeItems } = await import('../../../src/server/services/resume-visibility.js');

const HIDDEN_AT = Date.parse('2026-10-10T12:00:00Z');

describe('ResumeService', () => {
  let fetchJson;
  let service;
  const items = {
    movie: { Id: 'movie', Type: 'Movie', UserData: { PlaybackPositionTicks: 12_000_000_000 } },
    ep: { Id: 'ep', Type: 'Episode', SeriesId: 'show', UserData: { PlaybackPositionTicks: 5 } }
  };

  beforeEach(() => {
    memory.exec('DELETE FROM resume_hidden;');
    fetchJson = vi.fn(async (path) => {
      if (path === '/Shows/NextUp') return { Items: [{ Id: 'next' }] };
      if (path.startsWith('/UserItems/')) return {};
      const id = path.split('/').pop();
      if (!items[id]) throw Object.assign(new Error('x'), { status: 404 });
      return items[id];
    });
    service = createResumeService({ fetchJson, now: () => HIDDEN_AT });
  });

  it('asks Jellyfin for the next episode of a series', async () => {
    expect(await service.nextUp('u1', 't', 'show')).toEqual({ Id: 'next' });
    expect(fetchJson).toHaveBeenCalledWith('/Shows/NextUp', expect.objectContaining({
      query: expect.objectContaining({ SeriesId: 'show', UserId: 'u1', EnableResumable: 'true' })
    }));
  });

  it('resets a film\'s position and can put it back', async () => {
    const undo = await service.remove('u1', 't', 'movie');
    expect(undo).toEqual({ kind: 'position', itemId: 'movie', positionTicks: 12_000_000_000 });
    expect(fetchJson).toHaveBeenCalledWith('/UserItems/movie/UserData', expect.objectContaining({
      method: 'POST', query: { userId: 'u1' }, body: { PlaybackPositionTicks: 0 }
    }));

    await service.restore('u1', 't', undo);
    expect(fetchJson).toHaveBeenLastCalledWith('/UserItems/movie/UserData', expect.objectContaining({ body: { PlaybackPositionTicks: 12_000_000_000 } }));
  });

  it('hides a series until an episode is played again, and undo shows it at once', async () => {
    const undo = await service.remove('u1', 't', 'ep');
    expect(undo).toEqual({ kind: 'series', seriesId: 'show' });

    const before = { Id: 'e1', Type: 'Episode', SeriesId: 'show', UserData: { LastPlayedDate: '2026-10-09T00:00:00Z' } };
    const after = { Id: 'e2', Type: 'Episode', SeriesId: 'show', UserData: { LastPlayedDate: '2026-10-11T00:00:00Z' } };
    const other = { Id: 'm', Type: 'Movie' };
    expect(service.visible('u1', [before, other]).map(i => i.Id)).toEqual(['m']);
    expect(service.visible('u1', [after]).map(i => i.Id)).toEqual(['e2']);
    expect(service.visible('u2', [before]).map(i => i.Id)).toEqual(['e1']);
    // Registered for the Jellyfin services.
    expect(visibleResumeItems('u1', [before]).length).toBe(0);

    await service.restore('u1', 't', undo);
    expect(service.visible('u1', [before]).map(i => i.Id)).toEqual(['e1']);
  });

  it('refuses unknown titles and empty undo', async () => {
    await expect(service.remove('u1', 't', 'zz')).rejects.toMatchObject({ status: 404 });
    await expect(service.restore('u1', 't', null)).rejects.toMatchObject({ status: 400 });
  });
});
