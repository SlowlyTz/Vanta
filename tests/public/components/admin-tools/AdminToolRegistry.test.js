import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../src/public/js/api/requests.api.js', () => ({
  RequestsApi: { getOpenRequests: vi.fn(), getAllRequests: vi.fn() }
}));
vi.mock('../../../../src/public/js/api/admin-users.api.js', () => ({
  AdminUsersApi: { listUsers: vi.fn(), listLibraries: vi.fn() }
}));
vi.mock('../../../../src/public/js/api/auth.api.js', () => ({
  AuthApi: { getCurrentUser: vi.fn() }
}));
vi.mock('../../../../src/public/js/api/admin-settings.api.js', () => ({
  AdminSettingsApi: { getDiscordWebhook: vi.fn() }
}));

import {
  listAdminTools,
  createAdminTool
} from '../../../../src/public/js/components/admin-tools/AdminToolRegistry.js';

describe('AdminToolRegistry', () => {
  it('lists the areas in menu order with everything a card needs', () => {
    const tools = listAdminTools();

    expect(tools.map(tool => tool.id)).toEqual(['requests', 'users', 'settings']);
    tools.forEach(tool => {
      expect(tool.label).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(typeof tool.icon).toBe('function');
    });
  });

  it('hands out a fresh icon node per call so menu and section can both show one', () => {
    listAdminTools().forEach(tool => {
      expect(tool.icon()).not.toBe(tool.icon());
    });
  });

  it('builds nothing while only listing', () => {
    listAdminTools();

    expect(document.querySelector('.admin-requests-view')).toBeNull();
    expect(document.querySelector('.admin-users-view')).toBeNull();
  });

  it('builds exactly the requested area', () => {
    const tool = createAdminTool('users');

    expect(tool.id).toBe('users');
    expect(tool.element).toBeInstanceOf(HTMLElement);
    expect(typeof tool.setFilter).toBe('function');
    expect(typeof tool.destroy).toBe('function');
  });

  it('gives the settings area no filter, so it gets no search bar', () => {
    const tool = createAdminTool('settings');

    expect(tool.id).toBe('settings');
    expect(tool.setFilter).toBeUndefined();
  });

  it('returns null for an unknown id instead of guessing an area', () => {
    expect(createAdminTool('nope')).toBeNull();
    expect(createAdminTool(undefined)).toBeNull();
  });
});
