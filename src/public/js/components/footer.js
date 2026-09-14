import { createElement } from '../utils/dom.js';

const FOOTER_LINKS = [
  { label: 'Startseite', href: '#/home' },
  { label: 'Filme', href: '#/movies' },
  { label: 'Serien', href: '#/series' },
  { label: 'Publisher', href: '#/publishers' },
  { label: 'Profil', href: '#/profile' },
  { label: 'Meine Anfragen', href: '#/requests/mine' },
  { label: 'Trailer-Scroller', href: '#/scroller' }
];

// One slim line: brand, the main routes and the copyright.
export function Footer() {
  const year = new Date().getFullYear();

  return createElement('footer', { className: 'app-footer', 'aria-label': 'VANTA Footer' },
    createElement('div', { className: 'footer-inner' },
      createElement('a', { className: 'footer-brand', href: '#/home', 'aria-label': 'VANTA Startseite' },
        createElement('img', { className: 'footer-brand-logo', src: '/assets/logo-vanta.png', alt: '' }),
        createElement('span', { className: 'footer-brand-label' }, 'VANTA')
      ),
      createElement('nav', { className: 'footer-nav', 'aria-label': 'Footer Navigation' },
        createElement('ul', { className: 'footer-link-list' },
          FOOTER_LINKS.map(link => createElement('li', {},
            createElement('a', { className: 'footer-link', href: link.href }, link.label)
          ))
        )
      ),
      createElement('p', { className: 'footer-copyright' }, `© ${year} VANTA`)
    )
  );
}
