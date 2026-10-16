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
      return currentHash.startsWith('#/requests') || currentHash.startsWith('#/request-detail');
    case 'report':
      return currentHash.startsWith('#/report');
    case 'search':
      return currentHash.startsWith('#/search');
    // Meine Liste is a tab of the profile (#/profile?tab=watchlist).
    case 'watchlist':
      return currentHash.startsWith('#/watchlist') || currentHash.startsWith('#/profile?tab=watchlist');
    case 'favorites':
      return currentHash.startsWith('#/favorites') || currentHash.startsWith('#/profile?tab=favorites');
    case 'profile':
      return currentHash.startsWith('#/profile') && !currentHash.startsWith('#/profile?tab=watchlist');
    default:
      return false;
  }
}
