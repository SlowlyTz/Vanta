import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const MAX_LINES = 300;
const ROOTS = ['src', 'tests'];
const EXTENSIONS = new Set(['.js', '.css', '.html']);
const IGNORED = ['src/public/vendor', 'node_modules'];

async function walk(dir, files = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (IGNORED.some(prefix => full.startsWith(prefix))) continue;
    if (entry.isDirectory()) await walk(full, files);
    else if (EXTENSIONS.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

const oversized = [];

for (const root of ROOTS) {
  for (const file of await walk(root)) {
    const lines = (await readFile(file, 'utf8')).split('\n').length;
    if (lines > MAX_LINES) oversized.push({ file, lines });
  }
}

if (oversized.length > 0) {
  console.error('Files over 300 lines:');
  for (const { file, lines } of oversized) console.error(`${lines} ${file}`);
  process.exit(1);
}

console.log('lint:size OK — no files over 300 lines.');
