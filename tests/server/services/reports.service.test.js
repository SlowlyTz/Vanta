import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMemoryDb } from '../helpers/memoryDb.js';

const memory = await createMemoryDb();
vi.mock('../../../src/server/db/database.js', () => ({ default: memory }));
vi.mock('../../../src/server/services/jellyfin/items.service.js', () => ({
  ItemsService: { getItemDetails: vi.fn(), getSeasons: vi.fn(), getEpisodes: vi.fn() }
}));

const { ItemsService } = await import('../../../src/server/services/jellyfin/items.service.js');
const { ReportsService, validateReportInput } = await import('../../../src/server/services/reports.service.js');

const SERIES_ID = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const user = { userId: 'u1', username: 'alice', token: 't' };

describe('validateReportInput', () => {
  it('requires a known problem, and a description for "Anderes"', () => {
    expect(validateReportInput({ itemId: SERIES_ID, problem: 'nope' }).error).toMatch(/Problem/);
    expect(validateReportInput({ itemId: SERIES_ID, problem: 'other', message: '  ' }).error).toMatch(/beschreibe/);
    expect(validateReportInput({ itemId: SERIES_ID, problem: 'other', message: 'Ton fehlt' }).error).toBeUndefined();
  });

  it('requires the season and episode the scope names', () => {
    expect(validateReportInput({ itemId: SERIES_ID, problem: 'playback', scope: 'season' }).error).toMatch(/Staffel/);
    expect(validateReportInput({ itemId: SERIES_ID, problem: 'playback', scope: 'episode', seasonNumber: 1 }).error).toMatch(/Folge/);
    expect(validateReportInput({ itemId: 'x', problem: 'playback' }).error).toBe('Ungültiger Titel');
  });
});

describe('ReportsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    memory.exec('DELETE FROM reports');
    ItemsService.getItemDetails.mockResolvedValue({ Id: SERIES_ID, Type: 'Series', Name: 'Severance', ProductionYear: 2022 });
    ItemsService.getSeasons.mockResolvedValue([{ IndexNumber: 1 }, { IndexNumber: 2 }]);
    ItemsService.getEpisodes.mockResolvedValue([{ ParentIndexNumber: 2, IndexNumber: 3, Name: 'Who Is Alive?' }]);
  });

  it('stores an episode report with the title and episode name from Jellyfin', async () => {
    const report = await ReportsService.create(user, {
      itemId: SERIES_ID, scope: 'episode', seasonNumber: 2, episodeNumber: 3, problem: 'no-german', title: 'ignored'
    });

    expect(report).toMatchObject({
      title: 'Severance', item_type: 'Series', report_scope: 'episode', season_number: 2, episode_number: 3,
      episode_name: 'Who Is Alive?', problem: 'no-german', status: 'open', username: 'alice'
    });
    expect(ReportsService.getByUser('u1')).toHaveLength(1);
    expect(ReportsService.getOpen()).toHaveLength(1);
  });

  it('refuses a title the user cannot see, a missing season and an open duplicate', async () => {
    ItemsService.getItemDetails.mockResolvedValueOnce(null);
    await expect(ReportsService.create(user, { itemId: SERIES_ID, problem: 'playback' })).rejects.toMatchObject({ status: 404 });

    await expect(ReportsService.create(user, { itemId: SERIES_ID, scope: 'season', seasonNumber: 5, problem: 'playback' }))
      .rejects.toMatchObject({ status: 400 });

    await ReportsService.create(user, { itemId: SERIES_ID, problem: 'playback' });
    await expect(ReportsService.create(user, { itemId: SERIES_ID, problem: 'playback' })).rejects.toMatchObject({ status: 409 });
  });

  it('lets an admin resolve or dismiss a report, which takes it out of the open list', async () => {
    const report = await ReportsService.create(user, { itemId: SERIES_ID, problem: 'bad-quality' });

    const resolved = ReportsService.setStatus(report.id, 'resolved', 'admin');
    expect(resolved).toMatchObject({ status: 'resolved', handled_by: 'admin' });
    expect(ReportsService.getOpen()).toHaveLength(0);
    expect(ReportsService.getAll()).toHaveLength(1);
    expect(() => ReportsService.setStatus(999, 'dismissed', 'admin')).toThrow('Meldung nicht gefunden');
  });
});
