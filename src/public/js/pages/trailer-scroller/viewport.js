export function createScrollerViewportLock(win = window, doc = document) {
  let restoreScrollY = 0;
  let locked = false;

  return {
    lock() {
      if (locked) return;

      restoreScrollY = win.scrollY || doc.documentElement.scrollTop || 0;
      doc.documentElement.classList.add('trailer-scroller-active');
      doc.body.classList.add('trailer-scroller-active');

      // The scroller is a full-screen route. Keeping the previous page's
      // negative scroll offset here would move the newly mounted route out of view.
      doc.body.style.top = '0px';
      locked = true;
    },

    unlock() {
      if (!locked) return;

      doc.documentElement.classList.remove('trailer-scroller-active');
      doc.body.classList.remove('trailer-scroller-active');
      doc.body.style.top = '';
      win.scrollTo(0, restoreScrollY);
      locked = false;
    },

    isLocked() {
      return locked;
    }
  };
}
