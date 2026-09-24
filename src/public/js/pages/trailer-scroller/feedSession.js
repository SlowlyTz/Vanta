// The id of the shuffled feed the server currently holds for us.
//
// Deliberately a module variable and not sessionStorage: it has to die on a real page load (F5,
// new tab) so the server hands out a freshly shuffled For You feed, while surviving SPA route
// changes so leaving for the detail page and coming back keeps the running feed and its order.
let currentFeedId = null;

export function getFeedId() {
  return currentFeedId;
}

export function setFeedId(feedId) {
  currentFeedId = feedId || null;
}

