import { describe, it, expect, vi } from 'vitest';
import { EmptyState, ErrorState } from '../../../src/public/js/components/emptyState.js';

describe('EmptyState / ErrorState', () => {
  it('renders only the parts it is given', () => {
    const element = EmptyState({ message: 'Nichts da' });
    expect(element.className).toBe('search-empty-state');
    expect(element.querySelector('h3')).toBeNull();
    expect(element.querySelector('p').textContent).toBe('Nichts da');
    expect(element.querySelector('button')).toBeNull();
  });

  it('announces an error and offers to try again', () => {
    const retry = vi.fn();
    const element = ErrorState({ message: 'Kaputt', retry, className: 'library-error' });
    expect(element.getAttribute('role')).toBe('alert');
    expect(element.classList.contains('library-error')).toBe(true);
    expect(element.querySelector('h3').textContent).toBe('Fehler beim Laden');
    element.querySelector('button').click();
    expect(retry).toHaveBeenCalled();
    expect(element.querySelector('button').textContent).toBe('Erneut versuchen');
  });

  it('can offer another way out instead', () => {
    const onClick = vi.fn();
    const element = ErrorState({ message: 'x', action: { label: 'Zur Startseite', onClick } });
    expect(element.querySelector('button').textContent).toBe('Zur Startseite');
  });
});
