import { createElement } from '../utils/dom.js';

export function Footer() {
  const navLinks = [
    { label: 'Startseite', href: '#/home' },
    { label: 'Filme', href: '#/movies' },
    { label: 'Serien', href: '#/series' },
    { label: 'Suche', href: '#/search' }
  ];

  return createElement('footer', { className: 'app-footer' },
    createElement('div', { className: 'footer-brand' }, 'Slowly Stream'),
    createElement('nav', { className: 'footer-nav', 'aria-label': 'Footer Navigation' },
      navLinks.map(link => createElement('a', { href: link.href }, link.label))
    )
  );
}
