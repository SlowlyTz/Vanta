import { createElement } from '../../utils/dom.js';
import { bindSheetSwipe } from '../../utils/sheetSwipe.js';
import {
  createBackIcon, createCloseIcon, createPasswordIcon, createProfileIcon, createLogoutIcon,
  createBellIcon, createPlaybackIcon, createAppearanceIcon, createDevicesIcon, createChevronIcon
} from './icons.js';
import { createSettingsProfile } from './settingsOverview.js';
import { createPasswordForm } from './settingsPassword.js';
import { createAdminToolsPanel } from '../admin-tools/AdminToolsPanel.js';
import { APP_VERSION, formatVersion } from '../../shared/version.js';
import { openModal, focusableIn } from '../../utils/modal.js';
import { slidePanels, SLIDE_MS } from '../../utils/motion.js';
import { createNotificationsView } from '../settings/views/notificationsView.js';
import { createPlaybackView } from '../settings/views/playbackView.js';
import { createAppearanceView } from '../settings/views/appearanceView.js';
import { createDevicesView } from '../settings/views/devicesView.js';
import { followAfterBack, inAppLinkOf } from '../../utils/historyEntry.js';

// From this width the hub and the open area stand side by side.
const SPLIT_QUERY = '(min-width: 900px)';

// A row of the hub: icon, title, a short status on the right, chevron.
function hubRow({ label, icon, onClick, status = null }) {
  const statusEl = createElement('span', { className: 'settings-option-status' }, status || '');
  const button = createElement('button', { className: 'settings-option', type: 'button', onClick },
    createElement('span', { className: 'settings-option-main' },
      icon,
      createElement('span', { className: 'settings-option-label' }, label)
    ),
    statusEl,
    createChevronIcon()
  );
  return { element: button, setStatus: text => { statusEl.textContent = text || ''; } };
}

// The settings: a hub of areas (account, notifications, playback, look,
// devices, admin) with a page each. A bottom sheet on phones, where an area
// slides in over the hub; a dialog with the hub on the left and the open
// area on the right on wide screens. On a TV a full screen of the areas that
// make sense there (playback, look, the account), always side by side.
export function createSettingsDialog({ onLogout, onChangePassword, extensions = {} }) {
  const tv = document.documentElement.classList.contains('tv-mode');
  const settingsUsername = createElement('span', { className: 'settings-profile-name' }, 'Username');
  const { form: passwordForm, setStatus: setPasswordStatus } = createPasswordForm(onChangePassword);

  const logoutBtn = createElement('button', {
    className: 'settings-logout-button',
    type: 'button',
    onClick: () => {
      setSettingsOpen(false);
      onLogout?.();
    }
  },
    createLogoutIcon(),
    createElement('span', { className: 'settings-logout-label' }, 'Abmelden')
  );

  const { adminOption, loadAdminVisibility } = createAdminToolsPanel({
    onOpen: () => {
      setSettingsOpen(false);
      window.location.hash = '#/admin';
    }
  });

  const navigateTo = hash => () => {
    setSettingsOpen(false);
    window.location.hash = hash;
  };

  const rows = {};
  const views = {
    notifications: { title: 'Benachrichtigungen', view: createNotificationsView({ onStatus: text => rows.notifications.setStatus(text) }) },
    playback: { title: 'Wiedergabe', view: createPlaybackView({ onStatus: text => rows.playback.setStatus(text) }) },
    appearance: { title: 'Darstellung', view: createAppearanceView({ onStatus: text => rows.appearance.setStatus(text), extraRows: extensions.appearanceRows }) },
    devices: { title: 'Geräte', view: createDevicesView({ onStatus: text => rows.devices.setStatus(text), extraCards: extensions.deviceCards }) },
    password: { title: 'Passwort ändern', view: { element: passwordForm, refresh: () => {} } }
  };

  rows.notifications = hubRow({ label: 'Benachrichtigungen', icon: createBellIcon(), onClick: () => openArea('notifications') });
  rows.playback = hubRow({ label: 'Wiedergabe', icon: createPlaybackIcon(), onClick: () => openArea('playback') });
  rows.appearance = hubRow({ label: 'Darstellung', icon: createAppearanceIcon(), onClick: () => openArea('appearance') });
  rows.devices = hubRow({ label: 'Geräte', icon: createDevicesIcon(), onClick: () => openArea('devices') });
  rows.password = hubRow({ label: 'Passwort ändern', icon: createPasswordIcon(), onClick: () => openArea('password') });
  // The lists (Meine Liste, Verlauf …) are tabs on the profile.
  const profileRow = hubRow({ label: 'Profil', icon: createProfileIcon(), onClick: navigateTo('#/profile') });

  // Push, devices, the password and the admin area are not run from a TV.
  if (tv) {
    for (const key of ['notifications', 'devices', 'password']) rows[key].element.hidden = true;
  }

  const settingsProfile = createSettingsProfile(settingsUsername);
  const profileLink = createElement('a', { className: 'settings-profile-link', href: '#/profile', onClick: () => setSettingsOpen(false) }, 'Profil ansehen');
  settingsProfile.element.querySelector('.settings-profile-copy')?.appendChild(profileLink);
  const sectionTitle = text => createElement('h3', { className: 'settings-section-title' }, text);
  const group = (title, ...items) => createElement('section', { className: 'settings-section' },
    sectionTitle(title),
    createElement('div', { className: 'settings-options' }, ...items)
  );

  // Only admins see the Verwaltung group; its one entry decides.
  const adminSection = createElement('section', { className: 'settings-section', hidden: true },
    sectionTitle('Verwaltung'),
    createElement('div', { className: 'settings-options' }, adminOption)
  );

  // Open requests and reports waiting for an admin, on the Admin row.
  const adminBadge = createElement('span', { className: 'settings-option-badge', hidden: true });
  adminOption.querySelector('.settings-option')?.insertBefore(adminBadge, adminOption.querySelector('.settings-chevron'));
  const setAdminBadge = count => {
    adminBadge.textContent = String(count);
    adminBadge.hidden = !count;
  };

  const refreshAdminVisibility = async () => {
    await loadAdminVisibility();
    adminSection.hidden = adminOption.hidden || tv;
    settingsProfile.setAdmin(!adminOption.hidden);
  };

  const rootPanel = createElement('div', {
    className: 'settings-panel settings-panel-root',
    // A group: left from an area comes back to the row it belongs to.
    dataset: { view: 'root', tvGroup: '' }
  },
    settingsProfile.element,
    group('Konto', profileRow.element, rows.password.element),
    group('App', rows.notifications.element, rows.playback.element, rows.appearance.element, rows.devices.element),
    adminSection,
    createElement('div', { className: 'settings-logout-section' }, logoutBtn),
    createElement('p', { className: 'settings-version' }, `VANTA · ${formatVersion(APP_VERSION)}`)
  );

  const detailPanels = Object.fromEntries(Object.entries(views).map(([key, entry]) => [key, createElement('div', {
    className: `settings-panel settings-panel-detail settings-panel-${key}`,
    // A column: up and down stay in the area; only left leads back to the list.
    dataset: { view: key, tvColumn: '' },
    hidden: true
  }, entry.view.element)]));

  const settingsTitle = createElement('h2', {
    className: 'settings-dialog-title',
    id: 'settings-dialog-title'
  }, 'Einstellungen');

  const backButton = createElement('button', {
    className: 'settings-header-button invisible',
    type: 'button',
    'aria-label': 'Zurück',
    onClick: () => goBack()
  }, createBackIcon());

  const closeButton = createElement('button', {
    className: 'settings-header-button',
    type: 'button',
    'aria-label': 'Einstellungen schließen',
    onClick: () => setSettingsOpen(false)
  }, createCloseIcon());

  const detailHolder = createElement('div', { className: 'settings-detail' }, ...Object.values(detailPanels));

  const settingsDialog = createElement('div', {
    className: `settings-dialog${tv ? ' is-tv' : ''}`,
    id: 'settings-dialog',
    role: 'dialog',
    tabindex: '-1',
    'aria-modal': 'true',
    'aria-labelledby': 'settings-dialog-title'
  },
    createElement('div', { className: 'settings-dialog-header' },
      backButton,
      settingsTitle,
      closeButton
    ),
    createElement('div', { className: 'settings-body' }, rootPanel, detailHolder)
  );

  const settingsBackdrop = createElement('div', {
    className: 'settings-modal-backdrop',
    'aria-hidden': 'true',
    onClick: (event) => {
      if (event.target === settingsBackdrop) setSettingsOpen(false);
    }
  },
    settingsDialog
  );

  // Phones show the dialog as a sheet: swiping it down closes it.
  bindSheetSwipe({
    sheet: settingsDialog,
    getScrollElement: () => settingsDialog.querySelector('.settings-panel:not([hidden])'),
    onDismiss: () => setSettingsOpen(false)
  });

  let settingsOpen = false;
  let settingsView = 'root';
  let modal = null;
  let stopSlide = () => {};
  // Areas refreshed during this opening (each loads once per opening).
  const refreshed = new Set();
  // An area opened on a phone is a history entry, so the phone's Back key
  // closes the area, not the whole app page.
  let historyEntry = false;

  const splitQuery = window.matchMedia?.(SPLIT_QUERY) || null;
  const isSplit = () => tv || splitQuery?.matches === true;

  const refreshView = (key, { force = false } = {}) => {
    if (!views[key] || (!force && refreshed.has(key))) return;
    refreshed.add(key);
    views[key].view.refresh();
  };

  const panelOf = view => (view === 'root' ? rootPanel : detailPanels[view]);
  const visiblePanel = () => [rootPanel, ...Object.values(detailPanels)].find(panel => !panel.hidden && !panel.classList.contains('is-slide-out')) || null;

  const setSettingsView = (view, { focus = false } = {}) => {
    const next = views[view] && !(tv && rows[view]?.element.hidden) ? view : 'root';
    const split = isSplit();
    // Side by side, the hub stays and an area is always open.
    const shown = next === 'root' && split ? (settingsView !== 'root' ? settingsView : (tv ? 'playback' : 'notifications')) : next;
    const previous = settingsView;
    const fromPanel = visiblePanel();
    settingsView = shown;
    settingsDialog.classList.toggle('is-split', split);
    settingsTitle.textContent = split || settingsView === 'root' ? 'Einstellungen' : views[settingsView].title;
    backButton.classList.toggle('invisible', split || settingsView === 'root');
    settingsDialog.dataset.view = settingsView;

    stopSlide();
    const toPanel = panelOf(settingsView);
    if (split) {
      rootPanel.hidden = false;
      for (const [key, panel] of Object.entries(detailPanels)) panel.hidden = key !== settingsView;
      // The area beside the hub fades in a little offset.
      if (settingsOpen && previous !== settingsView && toPanel !== rootPanel) {
        toPanel.classList.add('is-entering');
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => toPanel.classList.remove('is-entering')));
      }
    } else {
      for (const panel of [rootPanel, ...Object.values(detailPanels)]) {
        if (panel !== toPanel && panel !== fromPanel) panel.hidden = true;
      }
      if (settingsOpen && fromPanel && fromPanel !== toPanel) {
        // An area sliding out lies over the body; its holder gives up its
        // room meanwhile, so the hub slides in at full width.
        const leaving = detailHolder.contains(fromPanel) && !detailHolder.contains(toPanel);
        detailHolder.classList.toggle('is-leaving', leaving);
        const stop = slidePanels({ from: fromPanel, to: toPanel, direction: settingsView === 'root' ? 'back' : 'forward' });
        const timer = window.setTimeout(() => detailHolder.classList.remove('is-leaving'), SLIDE_MS);
        stopSlide = () => {
          window.clearTimeout(timer);
          detailHolder.classList.remove('is-leaving');
          stop();
        };
      } else {
        if (fromPanel && fromPanel !== toPanel) fromPanel.hidden = true;
        toPanel.hidden = false;
      }
    }
    for (const [key, row] of Object.entries(rows)) {
      const current = split && key === settingsView;
      row.element.classList.toggle('is-current', current);
      if (current) row.element.setAttribute('aria-current', 'true');
      else row.element.removeAttribute('aria-current');
    }
    if (settingsView !== 'root') refreshView(settingsView);
    if (settingsView !== 'password') setPasswordStatus('');

    if (!focus) return;
    // Into the opened area, or back onto the row one came from.
    if (settingsView === 'root' || (split && focus === 'row')) {
      const row = rows[split ? settingsView : previous]?.element;
      (row && !row.hidden ? row : focusableIn(rootPanel)[0])?.focus({ preventScroll: true });
    } else {
      // The first control; on a TV a switch's row, not its hidden input.
      const first = [...toPanel.querySelectorAll('[data-tv-focusable], button:not([disabled]), a[href], input:not([tabindex="-1"]), select, textarea')]
        .find(element => !element.closest('[hidden]'));
      (first || focusableIn(toPanel)[0] || toPanel).focus?.({ preventScroll: true });
    }
  };

  const openArea = key => {
    if (isSplit() && key === settingsView) {
      // Already beside the hub; a TV remote's OK goes into it.
      if (tv) setSettingsView(key, { focus: 'panel' });
      return;
    }
    if (!isSplit() && !historyEntry) {
      try {
        window.history.pushState({ vantaSettingsArea: key }, '');
        historyEntry = true;
      } catch {
        historyEntry = false;
      }
    }
    setSettingsView(key, { focus: !isSplit() || tv ? 'panel' : false });
  };

  // One step back: from an area to the hub (on a phone the history entry
  // goes with it), from the area beside the hub on a TV to its row.
  // Returns false when there is no step left and the dialog may close.
  const goBack = () => {
    if (tv && isSplit()) {
      const row = rows[settingsView]?.element;
      if (row && !row.contains(document.activeElement) && !rootPanel.contains(document.activeElement)) {
        row.focus({ preventScroll: true });
        return true;
      }
      return false;
    }
    if (isSplit() || settingsView === 'root') return false;
    if (historyEntry) {
      window.history.back();
      return true;
    }
    setSettingsView('root', { focus: true });
    return true;
  };

  // TV: moving over the areas on the left shows each one on the right at
  // once; OK or right goes into it.
  if (tv) {
    for (const [key, row] of Object.entries(rows)) {
      row.element.addEventListener('focus', () => {
        if (settingsOpen && key !== settingsView && !row.element.hidden) setSettingsView(key);
      });
    }
  }

  const onPopState = () => {
    if (!historyEntry) return;
    historyEntry = false;
    if (settingsOpen && settingsView !== 'root' && !isSplit()) setSettingsView('root', { focus: true });
  };
  window.addEventListener('popstate', onPopState);

  // A link out of an area ("Code eingeben" → #/connect): the area's history
  // entry goes first, then the page changes. Following the link at once and
  // closing the dialog would go back from the new page again. Capture phase:
  // before a link's own handler closes the dialog.
  settingsDialog.addEventListener('click', event => {
    const target = inAppLinkOf(event);
    if (!target) return;
    event.preventDefault();
    const hadEntry = historyEntry;
    historyEntry = false;
    setSettingsOpen(false);
    if (hadEntry) followAfterBack(target);
    else window.location.hash = target;
  }, true);

  // Turning a tablet: the layout follows while the dialog is open.
  splitQuery?.addEventListener?.('change', () => {
    if (settingsOpen) setSettingsView(isSplit() ? settingsView : 'root');
  });

  // Focus, Escape, the backdrop click, the scroll lock and closing when the
  // page is left all come from openModal; the backdrop stays in the DOM and
  // is only shown and hidden.
  const setSettingsOpen = (open) => {
    if (settingsOpen === open) return;

    settingsOpen = open;
    settingsBackdrop.classList.toggle('open', settingsOpen);
    settingsBackdrop.setAttribute('aria-hidden', settingsOpen ? 'false' : 'true');

    if (!settingsOpen) {
      stopSlide();
      modal?.close();
      modal = null;
      setPasswordStatus('');
      settingsView = 'root';
      if (historyEntry) {
        historyEntry = false;
        window.history.back();
      }
      return;
    }

    refreshed.clear();
    settingsView = 'root';
    setSettingsView('root');
    modal = openModal({
      overlay: settingsBackdrop,
      dialog: settingsDialog,
      // On a TV the remote starts on the first area; elsewhere the dialog.
      initialFocus: tv ? rows.playback.element : settingsDialog,
      removeOnClose: false,
      closeOnBackdrop: false,
      onBack: goBack,
      onClose: () => setSettingsOpen(false)
    });
    // The statuses on the hub rows.
    for (const key of ['notifications', 'playback', 'appearance', 'devices']) {
      if (!(tv && rows[key].element.hidden)) refreshView(key);
    }
    refreshAdminVisibility();
  };

  setSettingsView('root');

  return {
    element: settingsBackdrop,
    settingsDialog,
    settingsUsername,
    adminOption,
    loadAdminVisibility: refreshAdminVisibility,
    setUsername: settingsProfile.setName,
    setAdminBadge,
    setSettingsView,
    setSettingsOpen,
    isOpen: () => settingsOpen
  };
}
