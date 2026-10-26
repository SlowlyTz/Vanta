// The one settings entry point of the player: a flyout that grows out of the
// gear button (a side sheet on phones) with a small stack of pages. The start
// page lists rows with their current value; a row drills into its page, which
// slides in from the right while the flyout animates to the new size.

import { escapeHtml } from '../html.js';

const CLOSE_DURATION_MS = 180;
const NON_TEXT_INPUTS = new Set(['checkbox', 'radio', 'button', 'submit', 'range']);

const isTextField = element => {
  if (!element) return false;
  if (element.isContentEditable || element.tagName === 'TEXTAREA') return true;
  return element.tagName === 'INPUT' && !NON_TEXT_INPUTS.has((element.getAttribute('type') || 'text').toLowerCase());
};
const PAGE_DURATION_MS = 280;
const SWIPE_CLOSE_PX = 70;

const BACK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z"/></svg>';
const CHEVRON_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.6 5.4 10 4l8 8-8 8-1.4-1.4 6.6-6.6z"/></svg>';

function prefersReducedMotion() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

// What identifies a control across a rebuild of its page.
const FOCUS_KEYS = ['page', 'optionId', 'value', 'episodeId', 'seasonId', 'userId', 'action'];
const toAttribute = key => `data-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`;
const cssString = value => `"${String(value).replace(/["\\]/g, '\\$&')}"`;

function focusKeyOf(element) {
  const candidates = [element.closest('button, [tabindex]'), element.closest('.vanta-settings-row')].filter(Boolean);
  for (const control of candidates) {
    const keys = FOCUS_KEYS.filter(key => control.dataset?.[key] !== undefined);
    if (keys.length) return keys.map(key => `[${toAttribute(key)}=${cssString(control.dataset[key])}]`).join('');
  }
  return null;
}

export function createSettingsFlyout({ container, button, onOpenChange = () => {} }) {
  const pages = new Map();
  const stack = [];
  let rows = () => [];
  let header = null;
  let state = 'closed';
  let closeTimer = null;
  let current = null;
  let swipeStart = null;

  const flyout = document.createElement('div');
  flyout.className = 'vanta-settings';
  flyout.setAttribute('role', 'dialog');
  flyout.setAttribute('aria-label', 'Einstellungen');
  flyout.dataset.state = 'closed';
  flyout.hidden = true;

  const viewport = document.createElement('div');
  viewport.className = 'vanta-settings-viewport';
  flyout.appendChild(viewport);
  container.appendChild(flyout);

  const focusables = () => [...(current?.querySelectorAll('.vanta-settings-focusable:not([disabled])') || [])];

  const renderRoot = page => {
    const title = document.createElement('div');
    title.className = 'vanta-settings-title';
    title.textContent = 'Einstellungen';
    page.appendChild(title);

    const headerContent = header?.();
    if (headerContent) page.appendChild(headerContent);

    const list = document.createElement('div');
    list.className = 'vanta-settings-list';
    rows().filter(row => !row.hidden).forEach(row => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'vanta-settings-row vanta-settings-focusable';
      item.dataset.page = row.page || row.id;
      item.disabled = Boolean(row.disabled);
      item.innerHTML = `
        <span class="vanta-settings-row-icon" aria-hidden="true">${row.icon || ''}</span>
        <span class="vanta-settings-row-label">${escapeHtml(row.label)}</span>
        <span class="vanta-settings-row-value">${escapeHtml(row.value)}</span>
        <span class="vanta-settings-row-chevron">${CHEVRON_ICON}</span>`;
      item.setAttribute('aria-label', row.value ? `${row.label}: ${row.value}` : row.label);
      // A row either opens its page or, like "Hilfe", runs an action.
      item.addEventListener('click', () => {
        if (row.onSelect) {
          close({ returnFocus: false });
          row.onSelect();
        } else {
          navigate(row.page);
        }
      });
      list.appendChild(item);
    });
    page.appendChild(list);
  };

  const renderSubpage = (page, id) => {
    const definition = pages.get(id);
    const head = document.createElement('div');
    head.className = 'vanta-settings-page-head';
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'vanta-settings-back vanta-settings-focusable';
    back.setAttribute('aria-label', 'Zurück');
    back.innerHTML = BACK_ICON;
    back.addEventListener('click', () => goBack());
    const title = document.createElement('div');
    title.className = 'vanta-settings-title';
    title.textContent = definition.title;
    head.append(back, title);
    page.appendChild(head);

    const body = document.createElement('div');
    body.className = 'vanta-settings-body';
    page.appendChild(body);
    definition.render(body, { close, back: goBack, refresh });
  };

  const buildPage = id => {
    const page = document.createElement('section');
    page.className = 'vanta-settings-page';
    page.dataset.page = id;
    if (id === 'root') renderRoot(page);
    else renderSubpage(page, id);
    flyout.classList.toggle('is-wide', Boolean(pages.get(id)?.wide));
    return page;
  };

  // `from`: the subpage just left; back on its parent the row that opened it
  // gets the focus again.
  const focusFirst = (from = null) => {
    const [first] = focusables();
    const opener = from ? current?.querySelector(`.vanta-settings-row[data-page="${from}"]`) : null;
    const selected = current?.querySelector('.vanta-settings-focusable[aria-checked="true"], .vanta-settings-focusable.is-current');
    (opener || selected || first)?.focus({ preventScroll: true });
  };

  let transition = null;

  const settleTransition = () => {
    if (!transition) return;
    const { animations, previous, timer } = transition;
    transition = null;
    window.clearTimeout(timer);
    // Finishing explicitly lands both pages in their end state even if the
    // animation clock stalled (throttled tab, headless renderer).
    animations.forEach(animation => {
      try { animation.finish(); } catch { /* already done */ }
    });
    previous.remove();
    viewport.style.height = '';
  };

  // Swaps pages; `direction` is 'forward' (drill in), 'back' or 'none'.
  const showPage = (id, direction, from = null) => {
    settleTransition();
    const previous = current;
    const next = buildPage(id);
    current = next;

    const canAnimate = typeof next.animate === 'function' && !prefersReducedMotion();
    if (!previous || direction === 'none' || !canAnimate) {
      viewport.replaceChildren(next);
      viewport.style.height = '';
      focusFirst(from);
      return;
    }

    viewport.style.height = `${previous.offsetHeight}px`;
    previous.classList.add('is-leaving');
    viewport.appendChild(next);
    viewport.style.height = `${next.offsetHeight}px`;

    const back = direction === 'back';
    const timing = { duration: PAGE_DURATION_MS, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' };
    const animations = [
      next.animate(back
        ? [{ transform: 'translateX(-30%)', opacity: 0 }, { transform: 'none', opacity: 1 }]
        : [{ transform: 'translateX(100%)' }, { transform: 'none' }], timing),
      previous.animate(back
        ? [{ transform: 'none' }, { transform: 'translateX(100%)' }]
        : [{ transform: 'none', opacity: 1 }, { transform: 'translateX(-30%)', opacity: 0 }], { ...timing, fill: 'forwards' })
    ];
    transition = { animations, previous, timer: window.setTimeout(settleTransition, PAGE_DURATION_MS + 40) };
    focusFirst(from);
  };

  function navigate(id) {
    if (!pages.has(id)) return;
    stack.push(id);
    showPage(id, 'forward');
  }

  function goBack() {
    if (stack.length <= 1) {
      close();
      return;
    }
    const left = stack.pop();
    showPage(stack[stack.length - 1], 'back', left);
  }

  // Rebuilds the open page (a party update, a new track list) and puts the
  // focus back on the same control, so a remote keeps working in it.
  function refresh() {
    if (state !== 'open' || !stack.length) return;
    const focused = document.activeElement;
    const hadFocus = Boolean(focused && current?.contains(focused));
    const selector = hadFocus ? focusKeyOf(focused) : null;
    const next = buildPage(stack[stack.length - 1]);
    viewport.replaceChildren(next);
    current = next;
    if (!hadFocus) return;
    const target = (selector && current.querySelector(selector)) || current.querySelector('button:not([disabled]), [tabindex="0"]');
    target?.focus({ preventScroll: true });
  }

  function open() {
    if (state === 'open') return;
    window.clearTimeout(closeTimer);
    stack.splice(0, stack.length, 'root');
    current = null;
    showPage('root', 'none');
    flyout.hidden = false;
    state = 'open';
    // Next frame, so the entrance transition runs from the closed state.
    void flyout.offsetWidth;
    flyout.dataset.state = 'open';
    button.setAttribute('aria-expanded', 'true');
    onOpenChange(true);
    focusFirst();
  }

  function close({ returnFocus = true } = {}) {
    if (state !== 'open') return;
    state = 'closing';
    flyout.dataset.state = 'closing';
    button.setAttribute('aria-expanded', 'false');
    onOpenChange(false);
    if (returnFocus && flyout.contains(document.activeElement)) button.focus({ preventScroll: true });
    closeTimer = window.setTimeout(() => {
      settleTransition();
      state = 'closed';
      flyout.dataset.state = 'closed';
      flyout.hidden = true;
      viewport.replaceChildren();
      current = null;
    }, prefersReducedMotion() ? 0 : CLOSE_DURATION_MS);
  }

  const toggle = () => (state === 'open' ? close() : open());

  const handleButtonClick = event => {
    event.stopPropagation();
    toggle();
  };

  const handleKeydown = event => {
    if (state !== 'open') return;
    const items = focusables();
    const index = items.indexOf(document.activeElement);

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (stack.length > 1) goBack();
      else close();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      if (!items.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      items[(index + step + items.length) % items.length].focus();
      return;
    }
    // In a text or number field (the sleep timer's minutes) Backspace and
    // the left/right arrows edit the value.
    const typing = isTextField(document.activeElement);
    if ((event.key === 'ArrowLeft' || event.key === 'Backspace') && stack.length > 1 && !typing) {
      event.preventDefault();
      event.stopPropagation();
      goBack();
      return;
    }
    if (typing && (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Backspace')) {
      event.stopPropagation();
      return;
    }
    if (event.key === 'ArrowRight' && document.activeElement?.classList.contains('vanta-settings-row')) {
      event.preventDefault();
      event.stopPropagation();
      document.activeElement.click();
      return;
    }
    // Everything else stays inside the flyout (no Space-to-pause while choosing).
    if (event.key === ' ' || event.key === 'k' || event.key === 'f' || event.key === 'm') event.stopPropagation();
  };

  const handleDocumentPointerDown = event => {
    if (state !== 'open') return;
    if (flyout.contains(event.target) || button.contains(event.target)) return;
    close({ returnFocus: false });
  };

  // Phones: the sheet follows a swipe to the right and closes past a threshold.
  const handlePointerDown = event => {
    if (event.pointerType !== 'touch') return;
    swipeStart = { x: event.clientX, y: event.clientY };
  };
  const handlePointerMove = event => {
    if (!swipeStart) return;
    const dx = event.clientX - swipeStart.x;
    const dy = Math.abs(event.clientY - swipeStart.y);
    if (dx > 0 && dx > dy) flyout.style.setProperty('--swipe', `${dx}px`);
  };
  const handlePointerUp = event => {
    if (!swipeStart) return;
    const dx = event.clientX - swipeStart.x;
    swipeStart = null;
    flyout.style.removeProperty('--swipe');
    if (dx > SWIPE_CLOSE_PX) close();
  };

  // Clicks inside must not reach the player (a click on the video toggles it).
  const stop = event => event.stopPropagation();

  button.hidden = false;
  button.addEventListener('click', handleButtonClick);
  flyout.addEventListener('keydown', handleKeydown);
  flyout.addEventListener('click', stop);
  flyout.addEventListener('pointerup', stop);
  flyout.addEventListener('pointerdown', handlePointerDown);
  flyout.addEventListener('pointermove', handlePointerMove);
  flyout.addEventListener('pointerup', handlePointerUp);
  flyout.addEventListener('pointercancel', handlePointerUp);
  document.addEventListener('pointerdown', handleDocumentPointerDown, true);

  return {
    element: flyout,
    registerPage(id, definition) {
      pages.set(id, definition);
    },
    setRows(provider) {
      rows = provider;
    },
    setHeader(provider) {
      header = provider;
    },
    open,
    close,
    toggle,
    navigate,
    back: goBack,
    refresh,
    isOpen: () => state === 'open',
    currentPage: () => stack[stack.length - 1] || null,
    destroy() {
      window.clearTimeout(closeTimer);
      settleTransition();
      button.removeEventListener('click', handleButtonClick);
      document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
      if (state === 'open') onOpenChange(false);
      flyout.remove();
      button.hidden = true;
    }
  };
}
