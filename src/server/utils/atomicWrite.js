import fs from 'fs';
import { dirname } from 'path';

// Writes `data` so the file is either the old or the new version, never half
// of one: a crash or a full disk mid-write only ever loses the temp file. The
// temp name is unique per call, so two writers never share one.
export function writeFileAtomicSync(file, data, { encoding } = {}) {
  const dir = dirname(file);
  fs.mkdirSync(dir, { recursive: true });

  const tmpFile = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  let fd = null;
  try {
    fd = fs.openSync(tmpFile, 'w');
    fs.writeFileSync(fd, data, encoding ? { encoding } : undefined);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;
    fs.renameSync(tmpFile, file);
  } catch (error) {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch { /* already closed */ }
    }
    try { fs.unlinkSync(tmpFile); } catch { /* never created */ }
    throw error;
  }

  // The rename itself only survives a power loss once the directory entry is
  // on disk; not every platform can open a directory, which is fine.
  try {
    const dirFd = fs.openSync(dir, 'r');
    try { fs.fsyncSync(dirFd); } finally { fs.closeSync(dirFd); }
  } catch { /* best effort */ }
}
