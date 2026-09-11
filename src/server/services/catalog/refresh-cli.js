import { formatRunSummary } from './sync.service.js';

const isConnectionRefused = (error) =>
  error?.cause?.code === 'ECONNREFUSED' || error?.code === 'ECONNREFUSED';

// Runs a catalogue sync from the command line. A running server owns the
// database file, so the command must not write it while one is up: it first
// asks the server over its local endpoint and only syncs in-process when no
// server answers.
export async function runRefresh({
  full = false,
  port,
  apiKey,
  fetchImpl = fetch,
  runLocal,
  print = console.log
}) {
  let record;

  try {
    const response = await fetchImpl(`http://127.0.0.1:${port}/api/internal/catalog/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Vanta-Key': apiKey },
      body: JSON.stringify({ full })
    });

    if (response.status === 401 || response.status === 403) {
      const body = await response.json().catch(() => ({}));
      throw new Error(`Server hat den Aufruf abgelehnt (${response.status}): ${body.error || ''}`.trim());
    }

    record = await response.json();
    print(`Läuft über den Server auf Port ${port}.`);
  } catch (error) {
    if (!isConnectionRefused(error)) throw error;

    print(`Kein Server auf Port ${port} — synchronisiere direkt.`);
    record = await runLocal({ full });
  }

  formatRunSummary(record).forEach(line => print(line));
  return record;
}
