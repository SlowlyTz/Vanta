import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAdminHeader } from '../../../../src/public/js/pages/admin/adminHeader.js';

describe('createAdminHeader', () => {
  afterEach(() => {
    document.body.innerHTML = '';
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

  it('clicking the magnifier or the padding around the field focuses the search input', () => {
    const header = createAdminHeader({ onSearch: vi.fn() });
    document.body.appendChild(header.element);

    const wrapper = header.element.querySelector('.admin-header-search-wrapper');
    const input = wrapper.querySelector('input');
    const icon = wrapper.querySelector('svg') || wrapper.firstElementChild;

    icon.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(document.activeElement).toBe(input);
  });

  it('clicking the clear button empties the field and leaves the caret in it', () => {
    const onSearch = vi.fn();
    const header = createAdminHeader({ onSearch });
    document.body.appendChild(header.element);

    const wrapper = header.element.querySelector('.admin-header-search-wrapper');
    const input = wrapper.querySelector('input');
    input.value = 'abc';
    input.dispatchEvent(new Event('input'));

    const clearButton = wrapper.querySelector('button');
    clearButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(input.value).toBe('');
    expect(onSearch).toHaveBeenCalledWith('');
    expect(document.activeElement).toBe(input);
    expect(clearButton.classList.contains('hidden')).toBe(true);
  });

  it('renders only the scoped search field — the settings gear moved to its own section', () => {
    const header = createAdminHeader({ onSearch: vi.fn() });

    expect(header.element.querySelector('.admin-header-settings-button')).toBeNull();
    expect(header.setSettingsOpen).toBeUndefined();
  });

  it('takes the placeholder and the accessible label from the section it belongs to', () => {
    const header = createAdminHeader({
      onSearch: vi.fn(),
      placeholder: 'Anfragen durchsuchen…',
      label: 'Anfragen durchsuchen'
    });
    const input = header.element.querySelector('.admin-header-search-input');

    expect(input.getAttribute('placeholder')).toBe('Anfragen durchsuchen…');
    expect(input.getAttribute('aria-label')).toBe('Anfragen durchsuchen');
  });
});
