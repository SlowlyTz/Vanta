// The build this page was served with (the server writes it into index.html
// in production) against the build the server runs now. Every source that
// learns the server's build (the API header, the app socket, /api/version)
// reports it here; a difference means a deploy happened since this page
// loaded, and the update overlay asks for a reload.
export const SERVER_BUILD_EVENT = 'vanta:server-build';
export const BUILD_HEADER = 'X-Vanta-Build';

export function getClientBuild(doc = document) {
  return doc.querySelector('meta[name="vanta-build"]')?.getAttribute('content') || null;
}

export function reportServerBuild(build) {
  if (typeof build !== 'string' || !build) return;
  window.dispatchEvent(new CustomEvent(SERVER_BUILD_EVENT, { detail: { build } }));
}

export async function checkServerBuild({ fetchImpl = (...args) => window.fetch(...args) } = {}) {
  try {
    const response = await fetchImpl('/api/version', { cache: 'no-store' });
    if (!response?.ok) return;
    const { build } = await response.json();
    reportServerBuild(build);
  } catch {
    // Offline or the server restarting: the next request or socket reconnect
    // reports the build instead.
  }
}
