// A small JSON file kept in memory. The file is looked at again at most once
// per `recheckMs` and only parsed when it changed, so an edit by hand still
// takes effect; writes are atomic and update the copy directly.
import fs from 'fs';
import { writeFileAtomicSync } from './atomicWrite.js';

export function createJsonStore(file, { empty, parse = data => data, recheckMs = 0, now = () => Date.now(), label = file } = {}) {
  let cached = null; // { data, version, checkedAt }

  const versionOf = stat => `${stat.mtimeMs}:${stat.size}`;

  const load = () => {
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      return { data: empty(), version: null };
    }
    if (cached && cached.version === versionOf(stat)) return cached;
    try {
      return { data: parse(JSON.parse(fs.readFileSync(file, 'utf8'))), version: versionOf(stat) };
    } catch (error) {
      console.warn(`[JsonStore] could not read ${label}:`, error.message);
      // Not cached: the next look reads again instead of keeping an empty copy.
      return { data: empty(), version: null };
    }
  };

  return {
    read() {
      const time = now();
      if (cached && recheckMs > 0 && time - cached.checkedAt < recheckMs) return cached.data;
      const { data, version } = load();
      cached = version === null ? null : { data, version, checkedAt: time };
      return data;
    },

    write(data) {
      writeFileAtomicSync(file, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8' });
      try {
        cached = { data, version: versionOf(fs.statSync(file)), checkedAt: now() };
      } catch {
        cached = null;
      }
    }
  };
}
