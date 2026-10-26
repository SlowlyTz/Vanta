// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runUpdate } from '../../scripts/update.js';

// Real git: a bare "origin", the checkout being updated ("server") and a
// second clone that pushes new commits. Install, build and verify are small
// node commands that leave a trace (or fail on purpose).
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const node = code => ['node', ['-e', code]];

let root;
let server;
let author;
let log;

const write = (dir, file, content) => fs.writeFileSync(path.join(dir, file), content);
const pushCommit = (files, message = 'change') => {
  Object.entries(files).forEach(([file, content]) => write(author, file, content));
  git(author, 'add', '-A');
  git(author, 'commit', '-q', '-m', message);
  git(author, 'push', '-q', 'origin', 'main');
};
const steps = ({ buildFails = false } = {}) => ({
  install: node("require('fs').appendFileSync('trace', 'install\\n')"),
  build: node(buildFails
    ? "if (require('fs').readFileSync('app.txt', 'utf8').includes('broken')) process.exit(3); require('fs').appendFileSync('trace', 'build\\n')"
    : "require('fs').appendFileSync('trace', 'build\\n')"),
  verify: [node("require('fs').appendFileSync('trace', 'verify\\n')")]
});
const trace = () => (fs.existsSync(path.join(server, 'trace')) ? fs.readFileSync(path.join(server, 'trace'), 'utf8').trim().split('\n') : []);
const update = (options = {}) => runUpdate({ cwd: server, steps: steps(), backupDir: 'backups', log: message => log.push(message), ...options });

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'vanta-update-'));
  const origin = path.join(root, 'origin.git');
  git(root, 'init', '-q', '--bare', '-b', 'main', origin);
  author = path.join(root, 'author');
  git(root, 'clone', '-q', origin, author);
  for (const dir of [author]) {
    git(dir, 'config', 'user.email', 'test@example.com');
    git(dir, 'config', 'user.name', 'Test');
  }
  write(author, '.gitignore', 'trace\nbackups/\ndb/\n');
  pushCommit({ 'app.txt': 'v1', 'package.json': '{}' }, 'first');
  server = path.join(root, 'server');
  git(root, 'clone', '-q', origin, server);
  fs.mkdirSync(path.join(server, 'db'));
  write(path.join(server, 'db'), 'requests.db', 'data');
  log = [];
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('update script', () => {
  it('does nothing when main is current', () => {
    expect(update().status).toBe('up-to-date');
    expect(trace()).toEqual([]);
  });

  it('pulls, backs up the databases, builds and verifies', () => {
    pushCommit({ 'app.txt': 'v2' });
    const result = update();
    expect(result.status).toBe('updated');
    expect(fs.readFileSync(path.join(server, 'app.txt'), 'utf8')).toBe('v2');
    // No dependency change: no install.
    expect(trace()).toEqual(['build', 'verify']);
    const backups = fs.readdirSync(path.join(server, 'backups'));
    expect(backups).toHaveLength(1);
    expect(fs.readFileSync(path.join(server, 'backups', backups[0], 'requests.db'), 'utf8')).toBe('data');
    expect(update().status).toBe('up-to-date');
  });

  it('installs when the dependencies changed', () => {
    pushCommit({ 'package.json': '{"dependencies":{}}' });
    update();
    expect(trace()).toEqual(['install', 'build', 'verify']);
  });

  it('goes back to the old commit and builds it when the new one fails', () => {
    const before = git(server, 'rev-parse', 'HEAD');
    pushCommit({ 'app.txt': 'broken' });
    const result = update({ steps: steps({ buildFails: true }) });
    expect(result.status).toBe('failed');
    expect(git(server, 'rev-parse', 'HEAD')).toBe(before);
    expect(fs.readFileSync(path.join(server, 'app.txt'), 'utf8')).toBe('v1');
    // The old state is built again.
    expect(trace()).toEqual(['build', 'verify']);
  });

  it('leaves a checkout alone that is not plain main', () => {
    pushCommit({ 'app.txt': 'v2' });
    write(server, 'app.txt', 'edited here');
    expect(update()).toMatchObject({ status: 'skipped', reason: expect.stringContaining('local changes') });
    git(server, 'checkout', '-q', '--', 'app.txt');

    git(server, 'checkout', '-q', '-b', 'feature');
    expect(update()).toMatchObject({ status: 'skipped', reason: expect.stringContaining('feature') });
    expect(trace()).toEqual([]);
  });

  it('keeps the old state when the merge cannot happen (an untracked file in the way)', () => {
    const before = git(server, 'rev-parse', 'HEAD');
    pushCommit({ 'new.txt': 'from origin' });
    write(server, 'new.txt', 'made here');

    const result = update();

    expect(result).toMatchObject({ status: 'skipped', reason: expect.stringContaining('update not applied') });
    expect(git(server, 'rev-parse', 'HEAD')).toBe(before);
    expect(fs.readFileSync(path.join(server, 'new.txt'), 'utf8')).toBe('made here');
    expect(trace()).toEqual([]);
  });

  it('keeps only the newest five backups', () => {
    for (let i = 0; i < 7; i += 1) {
      pushCommit({ 'app.txt': `v${i + 2}` });
      update();
    }
    expect(fs.readdirSync(path.join(server, 'backups'))).toHaveLength(5);
  });
});
