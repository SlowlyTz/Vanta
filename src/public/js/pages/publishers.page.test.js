import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MediaApi } from '../api/media.api.js';
import PublishersPage from './publishers.page.js';

vi.mock('../api/media.api.js', () => ({
  MediaApi: { getStudios: vi.fn() }
}));

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('PublishersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a local loader in the body while keeping the title visible, then removes it on success', async () => {
    let resolveStudios;
    MediaApi.getStudios.mockReturnValue(new Promise(resolve => { resolveStudios = resolve; }));

    const container = PublishersPage();
    expect(container.querySelector('h1').textContent).toBe('Publisher');
    expect(container.querySelector('.section-loader')).toBeTruthy();

    resolveStudios([{ Name: 'Studio A' }]);
    await flush();

    expect(container.querySelector('h1').textContent).toBe('Publisher');
    expect(container.querySelector('.section-loader')).toBeNull();
    expect(container.textContent).toContain('Studio A');
  });

  it('keeps the title visible and shows a retry action when loading fails', async () => {
    MediaApi.getStudios.mockRejectedValue(new Error('boom'));

    const container = PublishersPage();
    await flush();

    expect(container.querySelector('h1').textContent).toBe('Publisher');
    expect(container.querySelector('.section-loader')).toBeNull();
    expect(container.textContent).toContain('Fehler beim Laden');
  });
});
