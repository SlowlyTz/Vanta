import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { computeBuildId, injectBuildMeta } from '../../../src/server/config/build.js';

describe('computeBuildId', () => {
  let root;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'vanta-build-'));
    fs.mkdirSync(path.join(root, 'js'));
    fs.mkdirSync(path.join(root, 'assets'));
    fs.writeFileSync(path.join(root, 'index.html'), '<html></html>');
    fs.writeFileSync(path.join(root, 'js', 'app.js'), 'console.log(1);');
    fs.writeFileSync(path.join(root, 'assets', 'logo.png'), 'png');
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('stays the same for the same client code', () => {
    expect(computeBuildId([root])).toMatch(/^[0-9a-f]{12}$/);
    expect(computeBuildId([root])).toBe(computeBuildId([root]));
  });

  it('changes when client code changes, not when an image does', () => {
    const before = computeBuildId([root]);
    fs.writeFileSync(path.join(root, 'assets', 'logo.png'), 'other png');
    expect(computeBuildId([root])).toBe(before);

    fs.writeFileSync(path.join(root, 'js', 'app.js'), 'console.log(2);');
    expect(computeBuildId([root])).not.toBe(before);
  });

  it('ignores a missing directory', () => {
    expect(computeBuildId([root, path.join(root, 'missing')])).toBe(computeBuildId([root]));
  });
});

describe('injectBuildMeta', () => {
  it('puts the build id into the head', () => {
    expect(injectBuildMeta('<html><head><title>x</title></head></html>', 'abc123'))
      .toContain('<head>\n  <meta name="vanta-build" content="abc123">');
  });

  it('leaves the page alone without a build id', () => {
    expect(injectBuildMeta('<head></head>', null)).toBe('<head></head>');
  });
});
