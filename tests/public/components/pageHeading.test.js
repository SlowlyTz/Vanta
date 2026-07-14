import { describe, it, expect } from 'vitest';
import { PageHeading } from '../../../src/public/js/components/pageHeading.js';

describe('PageHeading', () => {
  it('renders a centered title with a rule underneath', () => {
    const header = PageHeading({ title: 'Alle Filme' });

    expect(header.tagName).toBe('HEADER');
    expect(header.className).toBe('page-heading');
    expect(header.querySelector('.page-heading-title').textContent).toBe('Alle Filme');
    expect(header.querySelector('.page-heading-rule')).toBeTruthy();
    expect(header.querySelector('.page-heading-subtitle')).toBeNull();
  });

  it('renders an optional subtitle', () => {
    const header = PageHeading({ title: 'Anfragen', subtitle: 'Suche neue Titel.' });

    expect(header.querySelector('.page-heading-subtitle').textContent).toBe('Suche neue Titel.');
  });

  it('omits the subtitle element when none is given', () => {
    const header = PageHeading({ title: 'Publisher' });

    expect(header.children.length).toBe(2);
  });
});
