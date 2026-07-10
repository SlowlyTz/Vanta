import { createAdminRequestsTool } from './requests/AdminRequestsTool.js';
import { createAdminUsersTool } from './users/AdminUsersTool.js';

export function createDefaultAdminTools() {
  return [
    createAdminRequestsTool(),
    createAdminUsersTool()
  ];
}
