import { createAdminRequestsTool } from './requests/AdminRequestsTool.js';
import { createAdminUsersTool } from './users/AdminUsersTool.js';

// Registry der Bereiche auf der Admin-Seite (src/public/js/pages/admin.page.js).
// onRequestsChanged wird durchgereicht, damit die Seite die Badge-Zahl an
// "Anfragen" aktuell halten kann, ohne selbst einen zweiten Request zu stellen.
export function createDefaultAdminTools({ onRequestsChanged } = {}) {
  return [
    createAdminRequestsTool({ onRequestsChanged }),
    createAdminUsersTool()
  ];
}
