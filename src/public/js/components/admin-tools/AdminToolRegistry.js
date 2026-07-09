import { createAdminRequestsTool } from './requests/AdminRequestsTool.js';

export function createDefaultAdminTools() {
  return [
    createAdminRequestsTool()
  ];
}
