import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import { join } from 'path';
import { writeFileAtomicSync } from '../../../src/server/utils/atomicWrite.js';

describe('writeFileAtomicSync', () => {
  let dir;
  afterEach(() => {
    vi.restoreAllMocks();
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });

  const tempDir = () => (dir = fs.mkdtempSync(join(os.tmpdir(), 'vanta-atomic-')));

  it('writes the file and creates missing directories', () => {
    const file = join(tempDir(), 'nested', 'data.json');
    writeFileAtomicSync(file, '{"a":1}\n', { encoding: 'utf8' });
    expect(fs.readFileSync(file, 'utf8')).toBe('{"a":1}\n');
    expect(fs.readdirSync(join(dir, 'nested'))).toEqual(['data.json']);
  });

  it('keeps the old content and leaves no temp file when the write fails', () => {
    const file = join(tempDir(), 'data.db');
    fs.writeFileSync(file, 'old');
    vi.spyOn(fs, 'fsyncSync').mockImplementationOnce(() => { throw new Error('ENOSPC'); });

    expect(() => writeFileAtomicSync(file, Buffer.from('new'))).toThrow('ENOSPC');
    expect(fs.readFileSync(file, 'utf8')).toBe('old');
    expect(fs.readdirSync(dir)).toEqual(['data.db']);
  });
});
