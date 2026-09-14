import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountOfflineOverlay } from '../../../src/public/js/components/offlineOverlay.js';

describe('mountOfflineOverlay', () => {
  let unmount;
  let fetchImpl;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    unmount = mountOfflineOverlay({ fetchImpl });
  });

  afterEach(() => {
    unmount();
    vi.useRealTimers();
  });

  const overlay = () => document.querySelector('.offline-overlay');

  it('is hidden while online', () => {
    expect(overlay().hidden).toBe(true);
    expect(overlay().textContent).toContain('Kein Internet');
  });

  it('shows after the delay when the browser goes offline and hides when it is back', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    window.dispatchEvent(new Event('offline'));
    expect(overlay().hidden).toBe(true);

    vi.advanceTimersByTime(1500);
    expect(overlay().hidden).toBe(false);

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    window.dispatchEvent(new Event('online'));
    expect(overlay().hidden).toBe(true);
  });

  it('does not show when the connection returns before the delay', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    window.dispatchEvent(new Event('offline'));
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    window.dispatchEvent(new Event('online'));

    vi.advanceTimersByTime(2000);
    expect(overlay().hidden).toBe(true);
  });

  it('probes the server on a network error and shows only when it is unreachable', async () => {
    fetchImpl.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    window.dispatchEvent(new CustomEvent('vanta:network-error'));
    await vi.advanceTimersByTimeAsync(1500);
    expect(fetchImpl).toHaveBeenCalledWith('/', { method: 'HEAD', cache: 'no-store' });
    expect(overlay().hidden).toBe(false);

    overlay().hidden = true;
    fetchImpl.mockResolvedValueOnce({ ok: true });
    window.dispatchEvent(new CustomEvent('vanta:network-error'));
    await vi.advanceTimersByTimeAsync(1500);
    expect(overlay().hidden).toBe(true);
  });

  it('hides again when "Erneut versuchen" reaches the server', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    window.dispatchEvent(new Event('offline'));
    vi.advanceTimersByTime(1500);
    expect(overlay().hidden).toBe(false);

    fetchImpl.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    overlay().querySelector('.offline-retry').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(overlay().hidden).toBe(false);
    expect(overlay().querySelector('.offline-status').textContent).toBe('Immer noch keine Verbindung.');

    fetchImpl.mockResolvedValueOnce({ ok: true });
    overlay().querySelector('.offline-retry').click();
    await vi.advanceTimersByTimeAsync(0);
    expect(overlay().hidden).toBe(true);
  });
});
