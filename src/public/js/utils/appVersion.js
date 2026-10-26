// Compares the build this page was served with against the one the server
// runs now. Every source that learns the server's build reports it here; a
// difference means a deploy happened and the update overlay asks for a reload.
export const SERVER_BUILD_EVENT = 'vanta:server-build';
export const BUILD_HEADER = 'X-Vanta-Build';

export function getClientBuild(doc = document) {
  return doc.querySelector('meta[name="vanta-build"]')?.getAttribute('content') || null;
}

// `version` is the release the server runs (1.01, 1.02 …) when the source
// knows it; the API header only carries the build.
export function reportServerBuild(build, version = null) {
  if (typeof build !== 'string' || !build) return;
  const detail = { build };
  if (typeof version === 'string' && version) detail.version = version;
  window.dispatchEvent(new CustomEvent(SERVER_BUILD_EVENT, { detail }));
}

export async function checkServerBuild({ fetchImpl = (...args) => window.fetch(...args) } = {}) {
  try {
    const response = await fetchImpl('/api/version', { cache: 'no-store' });
    if (!response?.ok) return;
    const { build, version } = await response.json();
    reportServerBuild(build, version);
  } catch {
    // Offline or the server restarting: the next request or socket reconnect
    // reports the build instead.
  }
}
