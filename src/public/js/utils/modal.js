// The one way VANTA opens a modal dialog: focus trap, Escape and backdrop
// close, scroll lock, inert background, focus return, and closing with its
// page. Modals stack; only the topmost one reacts to keys.
import { resolvePageScope } from './pageScope.js';

const FOCUSABLE = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', 'audio[controls]', 'video[controls]',
  '[contenteditable]:not([contenteditable="false"])', '[tabindex]:not([tabindex="-1"])'
].join(',');

// Elements on <body> that stay reachable while a modal is open: live
// regions and the blocking app-level notices above every dialog.
const KEEP_INTERACTIVE = '#toast-container, .update-overlay, .offline-overlay';

const stack = [];

// Whether an element can get the focus back (a drawer that closed meanwhile is hidden).
function canTakeFocus(element) {
  if (!element?.isConnected || element.closest?.('[inert], [hidden]')) return false;
  const style = window.getComputedStyle?.(element);
  return !style || (style.visibility !== 'hidden' && style.display !== 'none');
}

export const isModalOpen = () => stack.length > 0;

// The topmost open modal ({ dialog, overlay, close }), or null; the TV focus
// engine keeps the focus inside it.
export const getTopModal = () => stack[stack.length - 1] || null;

export function focusableIn(root) {
  return [...root.querySelectorAll(FOCUSABLE)].filter(element =>
    !element.closest('[hidden], [inert], .hidden, .invisible'));
}

// Scroll lock shared by all open modals: the body is pinned where the page
// was (iOS ignores overflow: hidden) and released when the last one closes.
let lockedScrollY = 0;
let lockCount = 0;

function lockScroll() {
  if (lockCount++ > 0) return;
  lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.documentElement.classList.add('modal-open');
  document.body.classList.add('modal-open');
  Object.assign(document.body.style, { position: 'fixed', top: `-${lockedScrollY}px`, left: '0', right: '0', width: '100%' });
}

function unlockScroll() {
  if (lockCount === 0 || --lockCount > 0) return;
  document.documentElement.classList.remove('modal-open');
  document.body.classList.remove('modal-open');
  Object.assign(document.body.style, { position: '', top: '', left: '', right: '', width: '' });
  window.scrollTo(0, lockedScrollY);
}

// Everything but the overlay's own branch goes inert: the siblings of the
// overlay and of each of its ancestors up to <body> (the settings dialog, for
// one, lives inside the app shell).
function makeBackgroundInert(overlay) {
  const changed = [];
  for (let node = overlay; node && node !== document.body && node.parentElement; node = node.parentElement) {
    for (const sibling of node.parentElement.children) {
      if (sibling === node || sibling.inert || sibling.matches(KEEP_INTERACTIVE) || sibling.tagName === 'SCRIPT') continue;
      sibling.inert = true;
      changed.push(sibling);
    }
  }
  return () => changed.forEach(element => { element.inert = false; });
}

function onKeydown(event) {
  const top = stack[stack.length - 1];
  if (!top) return;

  if (event.key === 'Escape' && top.closeOnEscape) {
    event.preventDefault();
    event.stopPropagation();
    // A dialog with steps (an open area of the settings) goes one back first.
    if (top.back?.()) return;
    top.close();
    return;
  }

  if (event.key !== 'Tab') return;
  const items = focusableIn(top.dialog);
  if (items.length === 0) {
    event.preventDefault();
    top.dialog.focus?.();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const inside = top.dialog.contains(document.activeElement);
  if (event.shiftKey && (document.activeElement === first || !inside)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
    event.preventDefault();
    first.focus();
  }
}

// Focus that wanders out (a click on the inert background cannot, but a
// script or the browser chrome can) is pulled back in.
function onFocusIn(event) {
  const top = stack[stack.length - 1];
  if (!top || top.dialog.contains(event.target) || top.overlay.contains(event.target)) return;
  if (event.target.closest?.(KEEP_INTERACTIVE)) return;
  (focusableIn(top.dialog)[0] || top.dialog).focus?.();
}

/**
 * @param {object} options
 * @param {HTMLElement} options.overlay   backdrop element; appended to <body> if detached
 * @param {HTMLElement} [options.dialog]  the dialog box inside it (defaults to the overlay)
 * @param {HTMLElement|string} [options.initialFocus] element or selector to focus first
 * @param {Function} [options.onClose]    runs once after the modal closed
 * @param {boolean} [options.removeOnClose=true] take the overlay out of the DOM on close
 * @param {boolean} [options.closeOnBackdrop=true]
 * @param {boolean} [options.closeOnEscape=true]
 * @param {boolean} [options.lockScroll=true]
 * @param {string}  [options.label]       aria-label when the dialog has no labelled heading
 * @param {object}  [options.pageScope]   closes with this page; defaults to the current one
 * @param {Function} [options.onBack]     Escape or a remote's Back: return true when it
 *                                        went a step back inside the dialog instead of closing
 * @param {Function} [options.returnFocus] the element to focus on close when the one that
 *                                        had the focus before is gone or hidden by then
 */
export function openModal({
  overlay,
  dialog = overlay,
  initialFocus = null,
  onClose = null,
  removeOnClose = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  lockScroll: shouldLockScroll = true,
  label = null,
  pageScope = null,
  onBack = null,
  returnFocus = null
}) {
  const previouslyFocused = document.activeElement;
  let closed = false;

  if (!dialog.hasAttribute('role')) dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  if (label && !dialog.hasAttribute('aria-labelledby')) dialog.setAttribute('aria-label', label);
  if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
  if (!overlay.isConnected) document.body.appendChild(overlay);

  const onBackdropClick = (event) => {
    if (event.target === overlay) handle.close();
  };
  if (closeOnBackdrop) overlay.addEventListener('click', onBackdropClick);

  if (stack.length === 0) {
    document.addEventListener('keydown', onKeydown, true);
    document.addEventListener('focusin', onFocusIn);
  }
  if (shouldLockScroll) lockScroll();
  const restoreBackground = makeBackgroundInert(overlay);

  const handle = {
    overlay,
    dialog,
    closeOnEscape,
    back: onBack,
    element: overlay,
    get isOpen() { return !closed; },
    close() {
      if (closed) return;
      closed = true;
      stopWithPage();
      const index = stack.indexOf(handle);
      if (index >= 0) stack.splice(index, 1);
      if (stack.length === 0) {
        document.removeEventListener('keydown', onKeydown, true);
        document.removeEventListener('focusin', onFocusIn);
      }
      overlay.removeEventListener('click', onBackdropClick);
      restoreBackground();
      if (shouldLockScroll) unlockScroll();
      if (removeOnClose) overlay.remove();
      const target = canTakeFocus(previouslyFocused) ? previouslyFocused : returnFocus?.();
      if (canTakeFocus(target)) target.focus?.({ preventScroll: true });
      onClose?.();
    }
  };

  stack.push(handle);
  const stopWithPage = resolvePageScope(pageScope).onLeave(() => handle.close());

  // A dialog that fades in can still be invisible (and so unfocusable) in the
  // first frame; focus is tried again for a moment until it lands inside.
  let focusTarget = typeof initialFocus === 'string' ? dialog.querySelector(initialFocus) : initialFocus;
  // On a TV a focused text field opens the system keyboard: start on the
  // first control that is not one (OK on the field opens VANTA's own).
  const tv = document.documentElement.classList.contains('tv-mode');
  const isTextField = element => element?.matches?.('input:not([type="checkbox"]):not([type="radio"]), textarea');
  if (tv && isTextField(focusTarget)) focusTarget = null;
  const firstFocusable = () => {
    const items = focusableIn(dialog);
    return tv ? items.find(element => !isTextField(element)) : items[0];
  };
  let focusTries = 0;
  const focusFirst = () => {
    if (closed || overlay.contains(document.activeElement)) return;
    (focusTarget || firstFocusable() || dialog).focus?.({ preventScroll: true });
    if (!overlay.contains(document.activeElement) && ++focusTries < 10) setTimeout(focusFirst, 40);
  };
  if (window.requestAnimationFrame) window.requestAnimationFrame(focusFirst);
  else focusFirst();

  return handle;
}

// Test helper: closes every open modal.
export function closeAllModals() {
  for (const handle of [...stack].reverse()) handle.close();
}
