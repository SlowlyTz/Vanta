import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAdminHeader } from '../../../../src/public/js/pages/admin/adminHeader.js';

describe('createAdminHeader', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces search input by ~150ms and trims the term before calling onSearch', async () => {
    const onSearch = vi.fn();
    const header = createAdminHeader({ onSearch });
    const input = header.element.querySelector('.admin-header-search-input');

    vi.useFakeTimers();
    input.value = '  alice  ';
    input.dispatchEvent(new Event('input'));

    expect(onSearch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(149);
    expect(onSearch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    vi.useRealTimers();

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('alice');
  });

  it('only fires once for rapid keystrokes (debounce resets on each input)', async () => {
    const onSearch = vi.fn();
    const header = createAdminHeader({ onSearch });
    const input = header.element.querySelector('.admin-header-search-input');

    vi.useFakeTimers();
    input.value = 'a';
    input.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(80);
    input.value = 'al';
    input.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(80);
    input.value = 'ali';
    input.dispatchEvent(new Event('input'));
    await vi.advanceTimersByTimeAsync(150);
    vi.useRealTimers();

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('ali');
  });

  it('shows the clear button once text is entered and hides it again when cleared', () => {
    const header = createAdminHeader({ onSearch: vi.fn() });
    const input = header.element.querySelector('.admin-header-search-input');
    const clearButton = header.element.querySelector('.admin-header-clear-button');

    expect(clearButton.classList.contains('hidden')).toBe(true);

    input.value = 'bob';
    input.dispatchEvent(new Event('input'));
    expect(clearButton.classList.contains('hidden')).toBe(false);

    clearButton.click();
    expect(clearButton.classList.contains('hidden')).toBe(true);
    expect(input.value).toBe('');
  });

  it('clear() empties the input, cancels a pending debounce and calls onSearch immediately with an empty term', async () => {
    const onSearch = vi.fn();
    const header = createAdminHeader({ onSearch });
    const input = header.element.querySelector('.admin-header-search-input');

    vi.useFakeTimers();
    input.value = 'alice';
    input.dispatchEvent(new Event('input'));

    header.clear();
    expect(onSearch).toHaveBeenCalledWith('');
    expect(input.value).toBe('');

    onSearch.mockClear();
    await vi.advanceTimersByTimeAsync(200);
    vi.useRealTimers();

    // The debounced call from before clear() must not fire afterwards.
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('getTerm() reflects the current (trimmed) input value', () => {
    const header = createAdminHeader({ onSearch: vi.fn() });
    const input = header.element.querySelector('.admin-header-search-input');

    input.value = '  hello  ';
    input.dispatchEvent(new Event('input'));

    expect(header.getTerm()).toBe('hello');
  });

  it('clicking the settings button calls onToggleSettings', () => {
    const onToggleSettings = vi.fn();
    const header = createAdminHeader({ onSearch: vi.fn(), onToggleSettings });
    const settingsButton = header.element.querySelector('.admin-header-settings-button');

    settingsButton.click();

    expect(onToggleSettings).toHaveBeenCalledTimes(1);
  });

  it('setSettingsOpen(true/false) is reflected in aria-expanded on the settings button', () => {
    const header = createAdminHeader({ onSearch: vi.fn(), onToggleSettings: vi.fn() });
    const settingsButton = header.element.querySelector('.admin-header-settings-button');

    expect(settingsButton.getAttribute('aria-expanded')).toBe('false');

    header.setSettingsOpen(true);
    expect(settingsButton.getAttribute('aria-expanded')).toBe('true');

    header.setSettingsOpen(false);
    expect(settingsButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('the settings button carries an accessible label and a focus-visible target', () => {
    const header = createAdminHeader({ onSearch: vi.fn() });
    const settingsButton = header.element.querySelector('.admin-header-settings-button');

    expect(settingsButton.getAttribute('aria-label')).toBe('Admin-Einstellungen');
    expect(settingsButton.tagName).toBe('BUTTON');
  });
});
