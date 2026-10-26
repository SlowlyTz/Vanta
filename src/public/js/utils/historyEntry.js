// In-app link handling around the browser history.

// An overlay that answers the browser's Back (a phone's settings area, the
// navigation drawer) pushes a history entry of its own. A link out of it
// must take that entry away first: following the link at once and going back
// afterwards would land on the page before it again.
export function followAfterBack(target, win = window) {
  let done = false;
  const follow = () => {
    if (done) return;
    done = true;
    win.removeEventListener('popstate', follow);
    win.location.hash = target;
  };
  win.addEventListener('popstate', follow);
  win.history.back();
  // A browser that sends no popstate here still gets there.
  win.setTimeout(follow, 300);
}

// The in-app link a click goes to (`#/…`), or null for anything else
// (another window, a modifier key, a link the page handles itself).
export function inAppLinkOf(event) {
  const link = event.target?.closest?.('a[href^="#/"]');
  if (!link || event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  return link.getAttribute('href');
}
