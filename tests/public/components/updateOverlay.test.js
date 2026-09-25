import { describe, it, expect, vi, afterEach } from 'vitest';
import { mountUpdateOverlay } from '../../../src/public/js/components/updateOverlay.js';
import { reportServerBuild } from '../../../src/public/js/utils/appVersion.js';

const versionResponse = build => ({ ok: true, json: async () => ({ build }) });

describe('mountUpdateOverlay', () => {
  let unmount = () => {};

  afterEach(() => {
    unmount();
    document.querySelectorAll('video').forEach(video => video.remove());
  });

  const overlay = () => document.querySelector('.update-overlay');

  it('does nothing without a build id of its own (development)', () => {
    const fetchImpl = vi.fn();
    unmount = mountUpdateOverlay({ clientBuild: null, fetchImpl });
    expect(overlay()).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('asks the server for its build on open and stays hidden when they match', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(versionResponse('build-a'));
    unmount = mountUpdateOverlay({ clientBuild: 'build-a', fetchImpl });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledWith('/api/version', { cache: 'no-store' }));
    await Promise.resolve();
    expect(overlay().hidden).toBe(true);
  });

  it('blocks the page on open when the server runs a newer build', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(versionResponse('build-b'));
    unmount = mountUpdateOverlay({ clientBuild: 'build-a', fetchImpl });
    await vi.waitFor(() => expect(overlay().hidden).toBe(false));
    expect(overlay().textContent).toContain('Neue Version verfügbar');
    expect(overlay().querySelector('button').textContent).toBe('Update');
  });

  it('shows when an API response or the socket reports another build, and pauses playback', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(versionResponse('build-a'));
    unmount = mountUpdateOverlay({ clientBuild: 'build-a', fetchImpl });
    const video = document.createElement('video');
    video.pause = vi.fn();
    document.body.appendChild(video);

    reportServerBuild('build-a');
    expect(overlay().hidden).toBe(true);

    reportServerBuild('build-b');
    expect(overlay().hidden).toBe(false);
    expect(video.pause).toHaveBeenCalled();
  });

  it('reloads past the cache when Update is pressed', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(versionResponse('build-b'));
    const reload = vi.fn();
    unmount = mountUpdateOverlay({ clientBuild: 'build-a', fetchImpl, reload });
    await vi.waitFor(() => expect(overlay().hidden).toBe(false));

    overlay().querySelector('button').click();
    await vi.waitFor(() => expect(reload).toHaveBeenCalled());
    expect(fetchImpl).toHaveBeenCalledWith(expect.any(String), { cache: 'reload' });
  });
});
