export function isNavLinkActive(link, currentHash) {
  switch (link.key) {
    case 'home':
      return currentHash === '#/home';
    case 'movies':
      return currentHash === '#/movies' || currentHash.startsWith('#/genre/Movie');
    case 'series':
      return currentHash === '#/series' || currentHash.startsWith('#/genre/Series');
    case 'scroller':
      return currentHash === '#/scroller';
    case 'publishers':
      return currentHash === '#/publishers'
        || currentHash.startsWith('#/publisher/')
        || currentHash.startsWith('#/publisher-group/');
    case 'requests':
      return currentHash === '#/requests';
    case 'search':
      return currentHash.startsWith('#/search');
    case 'favorites':
      return currentHash.startsWith('#/favorites');
    case 'profile':
      return currentHash.startsWith('#/profile');
    default:
      return false;
  }
}
