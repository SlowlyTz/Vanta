import { describe, it, expect, vi } from 'vitest';

describe('choiceRow', () => {
  const options = [{ value: 0, label: 'Aus' }, { value: 2, label: '2 Std.' }, { value: 4, label: '4 Std.' }, { value: 6, label: '6 Std.' }];

  const mount = async (onChange = vi.fn()) => {
    vi.useFakeTimers();
    const { choiceRow } = await import('../../../../src/public/js/components/settings/controls.js');
    const row = choiceRow({ label: '„Schaust du noch?“', options, value: 4, onChange });
    document.body.appendChild(row.element);
    const toggle = row.element.querySelector('.settings-dropdown-toggle');
    const menu = row.element.querySelector('.settings-dropdown-menu');
    return { row, toggle, menu, onChange };
  };
  const done = (row) => {
    row.element.remove();
    vi.useRealTimers();
  };

  it('is a dropdown: the value in a box, the menu opens on the chosen one, a pick closes it', async () => {
    const { row, toggle, menu, onChange } = await mount();
    expect(row.element.querySelector('.settings-dropdown-value').textContent).toBe('4 Std.');
    expect(menu.hidden).toBe(true);

    toggle.click();
    vi.advanceTimersByTime(20);
    expect(menu.hidden).toBe(false);
    expect(row.element.querySelector('.settings-dropdown').classList.contains('is-open')).toBe(true);
    expect(document.activeElement.textContent).toBe('4 Std.');
    expect(document.activeElement.getAttribute('aria-selected')).toBe('true');

    [...menu.querySelectorAll('.settings-dropdown-option')].find(button => button.textContent === 'Aus').click();
    expect(onChange).toHaveBeenCalledWith(0);
    expect(row.value).toBe(0);
    expect(row.element.querySelector('.settings-dropdown-value').textContent).toBe('Aus');
    expect(document.activeElement).toBe(toggle);
    // Closing plays out before the menu goes.
    expect(menu.hidden).toBe(false);
    vi.advanceTimersByTime(200);
    expect(menu.hidden).toBe(true);
    done(row);
  });

  it('arrows move through the choices; Escape closes only the menu', async () => {
    const { row, toggle } = await mount();
    const outer = vi.fn();
    document.addEventListener('keydown', outer, true);
    toggle.click();
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(document.activeElement.textContent).toBe('6 Std.');
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(row.isOpen).toBe(false);
    expect(outer).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
    expect(document.activeElement).toBe(toggle);
    document.removeEventListener('keydown', outer, true);
    done(row);
  });

  it('a click beside it closes it', async () => {
    const { row, toggle } = await mount();
    toggle.click();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(row.isOpen).toBe(false);
    done(row);
  });
});

describe('segmentedRow', () => {
  it('sits beside its label with up to three choices, under it with more', async () => {
    const { segmentedRow } = await import('../../../../src/public/js/components/settings/controls.js');
    const few = segmentedRow({ label: 'Tonspur', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' }], value: 'a' });
    const many = segmentedRow({ label: 'Viele', options: [1, 2, 3, 4].map(value => ({ value, label: String(value) })), value: 1 });
    expect(few.element.classList.contains('is-inline')).toBe(true);
    expect(many.element.classList.contains('is-inline')).toBe(false);
  });
});

describe('switchCell', () => {
  it('is a switch without text, named for screen readers', async () => {
    const { switchCell } = await import('../../../../src/public/js/components/settings/controls.js');
    const onChange = vi.fn();
    const cell = switchCell({ label: 'Mitteilungen: Push', checked: true, onChange });
    expect(cell.input.getAttribute('aria-label')).toBe('Mitteilungen: Push');
    expect(cell.element.textContent).toBe('');
    cell.input.checked = false;
    cell.input.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledWith(false, cell.input);
  });
});
