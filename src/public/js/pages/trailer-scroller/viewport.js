export function createScrollerViewportLock(win = window, doc = document) {
  let restoreScrollY = 0;
  let locked = false;
  let footer = null;

  // #app does not scroll during the scroller (overflow hidden), but moving
  // the focus (Tab onto the footer) still shifts it, which pushed the header
  // out of view and stayed so for the next visit. It is held at the top, and
  // the footer behind the full-screen route takes no focus.
  const app = () => doc.getElementById('app');
  const holdAtTop = () => {
    const element = app();
    if (element && element.scrollTop !== 0) element.scrollTop = 0;
  };

  return {
    lock() {
      if (locked) return;

      restoreScrollY = win.scrollY || doc.documentElement.scrollTop || 0;
      doc.documentElement.classList.add('trailer-scroller-active');
      doc.body.classList.add('trailer-scroller-active');

      // The scroller is a full-screen route. Keeping the previous page's
      // negative scroll offset here would move the newly mounted route out of view.
      doc.body.style.top = '0px';
      holdAtTop();
      app()?.addEventListener('scroll', holdAtTop);
      footer = doc.querySelector('.app-footer');
      if (footer) footer.inert = true;
      locked = true;
    },

    unlock() {
      if (!locked) return;

      doc.documentElement.classList.remove('trailer-scroller-active');
      doc.body.classList.remove('trailer-scroller-active');
      doc.body.style.top = '';
      app()?.removeEventListener('scroll', holdAtTop);
      if (footer) footer.inert = false;
      footer = null;
      win.scrollTo(0, restoreScrollY);
      locked = false;
    },

    isLocked() {
      return locked;
    }
  };
}
