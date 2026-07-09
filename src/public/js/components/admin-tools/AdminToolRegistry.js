import { createAdminRequestsTool } from './requests/AdminRequestsTool.js';
import { createTranscodingTool } from './transcoding/TranscodingTool.js';

export function createDefaultAdminTools() {
  return [
    createAdminRequestsTool(),
    createTranscodingTool()
  ];
}
