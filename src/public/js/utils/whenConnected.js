// Pages are built before the router attaches them (the previous view is
// still animating out). Anything that needs layout, like restoring a scroll
// position, waits here until the element is actually in the document.
export function whenConnected(element, callback, { maxFrames = 120 } = {}) {
  let frames = 0;
  const check = () => {
    if (element.isConnected) {
      callback();
      return;
    }
    if (++frames >= maxFrames) return;
    (window.requestAnimationFrame || (fn => setTimeout(fn, 16)))(check);
  };
  check();
}
