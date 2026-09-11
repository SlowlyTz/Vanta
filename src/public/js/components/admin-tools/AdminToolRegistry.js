import { ADMIN_REQUESTS_TOOL, createAdminRequestsTool } from './requests/AdminRequestsTool.js';
import { ADMIN_USERS_TOOL, createAdminUsersTool } from './users/AdminUsersTool.js';
import { ADMIN_SETTINGS_TOOL, createAdminSettingsPanel } from '../../pages/admin/adminSettingsPanel.js';

// Registry der Bereiche auf der Admin-Seite (src/public/js/pages/admin.page.js).
// Das Menü unter #/admin wird aus dieser Liste erzeugt, die Bereichsrouten
// (#/admin/<id>) bauen genau einen davon — deshalb steckt die Beschreibung in
// `meta` und die Instanziierung dahinter in `create`.
const ADMIN_TOOLS = [
  { meta: ADMIN_REQUESTS_TOOL, create: createAdminRequestsTool },
  { meta: ADMIN_USERS_TOOL, create: createAdminUsersTool },
  { meta: ADMIN_SETTINGS_TOOL, create: createAdminSettingsPanel }
];

// Menu data only: { id, label, description, icon }, in menu order.
export function listAdminTools() {
  return ADMIN_TOOLS.map(tool => tool.meta);
}

// Builds a single area. Returns null for an unknown id so the page can fall
// back to the menu instead of rendering an empty section.
export function createAdminTool(id) {
  const tool = ADMIN_TOOLS.find(entry => entry.meta.id === id);
  return tool ? tool.create() : null;
}
