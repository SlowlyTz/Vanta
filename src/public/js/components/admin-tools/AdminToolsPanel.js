import { createElement } from '../../utils/dom.js';
import { createAdminIcon } from '../navbar/icons.js';
import { createSettingsOption } from '../navbar/settingsHelpers.js';
import { AuthApi } from '../../api/auth.api.js';

// Die Admin-Verwaltung lebt inzwischen als eigene Seite unter #/admin
// (src/public/js/pages/admin.page.js). Dieses Modul behält aus dem
// Einstellungen-Dialog heraus nur noch die Kachel "Admin-Tools" samt
// Sichtbarkeits- und Zugriffsprüfung — das Panel- und Tool-Grid von früher
// entfällt vollständig.
export function createAdminToolsPanel({ onOpen } = {}) {
  const adminOption = createElement('div', { className: 'admin-option-container' },
    createSettingsOption('Admin-Tools', () => checkAdminAndOpenAdmin(), createAdminIcon())
  );

  const checkAdminAndOpenAdmin = async () => {
    try {
      const data = await AuthApi.getCurrentUser();
      if (data?.user?.isAdmin !== true) return;
      onOpen?.();
    } catch (error) {
      console.error('Admin check failed:', error);
    }
  };

  const loadAdminVisibility = async () => {
    try {
      const data = await AuthApi.getCurrentUser();
      const isAdmin = data?.user?.isAdmin === true;
      adminOption.hidden = !isAdmin;
    } catch (error) {
      console.error('Could not load admin visibility:', error);
      adminOption.hidden = true;
    }
  };

  return {
    adminOption,
    loadAdminVisibility,
    checkAdminAndOpenAdmin
  };
}
