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

describe('page style bundles', () => {
  it('reads the hashed bundle files from the Vite manifest and writes them into the page', async () => {
    const { readPageStyles, injectPageStyles } = await import('../../../src/server/config/build.js');
    const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'vanta-dist-'));
    fs.mkdirSync(path.join(dist, '.vite'));
    fs.writeFileSync(path.join(dist, '.vite', 'manifest.json'), JSON.stringify({
      'index.html': { file: 'assets/index-1.js', isEntry: true },
      'css/bundles/admin.css': { file: 'assets/page-admin-AbC.css', isEntry: true },
      'css/bundles/player.css': { file: 'assets/page-player-XyZ.css', isEntry: true }
    }));

    const styles = readPageStyles(dist);
    expect(styles).toEqual({ admin: '/assets/page-admin-AbC.css', player: '/assets/page-player-XyZ.css' });

    const html = injectPageStyles('<html><head><title>x</title></head><body></body></html>', styles);
    const block = html.match(/<script type="application\/json" id="vanta-page-styles">(.*)<\/script>\n<\/head>/);
    expect(JSON.parse(block[1])).toEqual(styles);

    expect(readPageStyles(path.join(dist, 'missing'))).toBeNull();
    expect(injectPageStyles('<head></head>', null)).toBe('<head></head>');
    fs.rmSync(dist, { recursive: true, force: true });
  });
});
