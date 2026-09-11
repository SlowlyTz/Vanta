import { describe, it, expect, vi } from 'vitest';
import { createAdminRequestItem } from '../../../../../src/public/js/components/admin-tools/requests/adminRequestItem.js';

vi.mock('../../../../../src/public/js/api/requests.api.js', () => ({
  RequestsApi: {
    approveRequest: vi.fn(),
    rejectRequest: vi.fn()
  }
}));

function makeRequest(overrides = {}) {
  return {
    id: 1,
    tmdb_id: 42,
    tmdb_type: 'tv',
    title: 'Test Show',
    username: 'alice',
    status: 'pending',
    request_scope: 'all',
    season_number: null,
    episode_number: null,
    created_at: '2024-01-15T12:00:00.000Z',
    ...overrides
  };
}

const scopeText = request =>
  createAdminRequestItem(makeRequest(request)).querySelector('.admin-request-item-scope').textContent;

describe('createAdminRequestItem', () => {
  it('shows the scope of the request so rows for the same title stay distinguishable', () => {
    expect(scopeText({ request_scope: 'all' })).toBe('Komplette Serie');
    expect(scopeText({ request_scope: 'season', season_number: 2 })).toBe('Staffel 2');
    expect(scopeText({ request_scope: 'episode', season_number: 1, episode_number: 3 })).toBe('S01E03');
    expect(scopeText({ tmdb_type: 'movie', request_scope: 'all' })).toBe('Ganzer Film');
  });

  it('falls back to the whole-title label for legacy rows without a scope', () => {
    const row = makeRequest();
    delete row.request_scope;

    expect(createAdminRequestItem(row).querySelector('.admin-request-item-scope').textContent)
      .toBe('Komplette Serie');
  });

  it('keeps user, type and date next to the scope', () => {
    const meta = createAdminRequestItem(makeRequest({ request_scope: 'season', season_number: 4 }))
      .querySelector('.admin-request-item-meta');

    expect(meta.textContent).toContain('alice');
    expect(meta.textContent).toContain('Serie');
    expect(meta.textContent).toContain('Staffel 4');
    expect(meta.querySelector('.admin-request-item-date')).toBeTruthy();
  });
});
