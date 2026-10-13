// DOM-free: shared by the web app, the player bundle and the server.

// The VANTA release this code belongs to. Bump it with every release branch
// (1.01, 1.02, … up to the next minor such as 1.1); the client bundles its own
// copy, so an open tab still knows the version it was loaded with and the
// update overlay can show "1.01 → 1.02" once the server runs a newer one.
export const APP_VERSION = '1.1';

export const formatVersion = (version) => (version ? `Version ${version}` : '');
