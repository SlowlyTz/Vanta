import { describe, it, expect, vi } from 'vitest';
import { createAdminSearchResults } from '../../../../src/public/js/pages/admin/adminSearch.js';

function makeUsers() {
  return [
    { id: 'u1', name: 'alice' },
    { id: 'u2', name: 'bob' },
    { id: 'u3', name: 'Alicia' }
  ];
}

function makeRequests() {
  return [
    { id: 'r1', title: 'The Matrix', username: 'bob' },
    { id: 'r2', title: 'Inception', username: 'alice' },
    { id: 'r3', title: 'Alien', username: 'carol' }
  ];
}

describe('createAdminSearchResults', () => {
  it('groups matches by users (name match) and requests (title match) with a count each', () => {
    const search = createAdminSearchResults({ onSelectUser: vi.fn(), onSelectRequest: vi.fn() });
    search.render({ term: 'ali', users: makeUsers(), requests: makeRequests() });

    const groups = search.element.querySelectorAll('.admin-search-group');
    expect(groups).toHaveLength(2);

    const userGroup = groups[0];
    expect(userGroup.querySelector('.admin-search-group-title').textContent).toBe('Nutzer');
    expect(userGroup.querySelector('.admin-search-group-count').textContent).toBe('2');
    const userNames = Array.from(userGroup.querySelectorAll('.admin-search-result-user .admin-search-result-title'))
      .map(el => el.textContent);
    expect(userNames).toEqual(['alice', 'Alicia']);

    const requestGroup = groups[1];
    expect(requestGroup.querySelector('.admin-search-group-title').textContent).toBe('Anfragen');
    // "ali" matches "Alien" (title) as well as "alice"'s request "Inception" (requesting user).
    expect(requestGroup.querySelector('.admin-search-group-count').textContent).toBe('2');
  });

  it('matches requests both by title and by the requesting username', () => {
    const search = createAdminSearchResults({ onSelectUser: vi.fn(), onSelectRequest: vi.fn() });
    search.render({ term: 'bob', users: makeUsers(), requests: makeRequests() });

    const requestTitles = Array.from(search.element.querySelectorAll('.admin-search-result-request .admin-search-result-title'))
      .map(el => el.textContent);
    // "The Matrix" matches because it was requested by bob, even though the title itself doesn't contain "bob".
    expect(requestTitles).toEqual(['The Matrix']);
  });

  it('clicking a user result calls onSelectUser with the full user object', () => {
    const onSelectUser = vi.fn();
    const search = createAdminSearchResults({ onSelectUser, onSelectRequest: vi.fn() });
    search.render({ term: 'bob', users: makeUsers(), requests: [] });

    search.element.querySelector('.admin-search-result-user').click();

    expect(onSelectUser).toHaveBeenCalledWith(expect.objectContaining({ id: 'u2', name: 'bob' }));
  });

  it('clicking a request result calls onSelectRequest with the full request object', () => {
    const onSelectRequest = vi.fn();
    const search = createAdminSearchResults({ onSelectUser: vi.fn(), onSelectRequest });
    search.render({ term: 'matrix', users: [], requests: makeRequests() });

    search.element.querySelector('.admin-search-result-request').click();

    expect(onSelectRequest).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1', title: 'The Matrix' }));
  });

  it('shows an empty state with the search term when nothing matches', () => {
    const search = createAdminSearchResults({ onSelectUser: vi.fn(), onSelectRequest: vi.fn() });
    search.render({ term: 'zzz-nichts', users: makeUsers(), requests: makeRequests() });

    expect(search.element.querySelectorAll('.admin-search-group')).toHaveLength(0);
    const emptyState = search.element.querySelector('.search-empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState.textContent).toContain('zzz-nichts');
  });

  it('clear() empties the rendered results', () => {
    const search = createAdminSearchResults({ onSelectUser: vi.fn(), onSelectRequest: vi.fn() });
    search.render({ term: 'ali', users: makeUsers(), requests: makeRequests() });
    expect(search.element.children.length).toBeGreaterThan(0);

    search.clear();

    expect(search.element.children.length).toBe(0);
  });
});
