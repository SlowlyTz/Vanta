import { createElement } from '../utils/dom.js';

export function Footer() {
  const linkGroups = [
    {
      title: 'Entdecken',
      links: [
        { label: 'Startseite', href: '#/home' },
        { label: 'Filme', href: '#/movies' },
        { label: 'Serien', href: '#/series' },
        { label: 'Publisher', href: '#/publishers' }
      ]
    },
    {
      title: 'Dein Bereich',
      links: [
        { label: 'Profil', href: '#/profile' },
        { label: 'Meine Anfragen', href: '#/requests/mine' },
        { label: 'Suche', href: '#/search' },
        { label: 'Trailer-Scroller', href: '#/scroller' }
      ]
    }
  ];

  const directory = createElement('div', { className: 'footer-directory' },
    linkGroups.map((group, groupIndex) => {
      const headingId = `footer-group-${groupIndex}`;

      return createElement('nav', {
        className: 'footer-link-group',
        'aria-labelledby': headingId
      },
        createElement('h3', { className: 'footer-link-heading', id: headingId }, group.title),
        createElement('ul', { className: 'footer-link-list' },
          group.links.map(link => createElement('li', {},
            createElement('a', { className: 'footer-link', href: link.href },
              createElement('span', {}, link.label),
              createElement('span', { className: 'footer-link-arrow', 'aria-hidden': 'true' }, '→')
            )
          ))
        )
      );
    })
  );

  const year = new Date().getFullYear();

  return createElement('footer', { className: 'app-footer', 'aria-label': 'VANTA Footer' },
    createElement('div', { className: 'footer-atmosphere', 'aria-hidden': 'true' }),
    createElement('div', { className: 'footer-inner' },
      createElement('div', { className: 'footer-main' },
        createElement('section', { className: 'footer-intro', 'aria-labelledby': 'footer-title' },
          createElement('a', {
            className: 'footer-brand',
            href: '#/home',
            'aria-label': 'VANTA Startseite'
          },
            createElement('img', {
              className: 'footer-brand-logo',
              src: '/assets/logo-vanta.png',
              alt: ''
            }),
            createElement('span', { className: 'footer-brand-label' }, 'Deine Mediathek')
          ),
          createElement('p', { className: 'footer-kicker' }, 'Filme. Serien. Dein Abend.'),
          createElement('h2', { className: 'footer-title', id: 'footer-title' },
            'Deine nächste Geschichte wartet schon.'
          ),
          createElement('p', { className: 'footer-description' },
            'Entdecke deine Sammlung neu, finde alte Favoriten wieder und starte direkt in den nächsten Filmabend.'
          )
        ),
        directory
      ),
      createElement('div', { className: 'footer-bottom' },
        createElement('p', { className: 'footer-copyright' },
          `© ${year} VANTA`,
          createElement('span', { 'aria-hidden': 'true' }),
        ),
        createElement('p', { className: 'footer-status' },

        )
      )
    ),
    createElement('div', { className: 'footer-edge', 'aria-hidden': 'true' })
  );
}
