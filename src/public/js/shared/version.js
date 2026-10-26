// The VANTA release this code belongs to; DOM-free, shared by the web app, the
// player bundle and the server.

// Bump it with every release. The client bundles its own copy, so an open tab knows
// the version it was loaded with and the update overlay can show "1.1 → 1.1.1".
export const APP_VERSION = '1.2.0';

export const formatVersion = (version) => (version ? `Version ${version}` : '');
