// Holds the id of the shuffled trailer feed the server keeps for us.
// A module variable, not sessionStorage: a real page load must get a fresh shuffle,
// while SPA route changes (detail page and back) keep the running feed and its order.
let currentFeedId = null;

export function getFeedId() {
  return currentFeedId;
}

export function setFeedId(feedId) {
  currentFeedId = feedId || null;
}

