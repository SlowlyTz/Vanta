// Updates this checkout from origin/main (fetch, back up db/, fast-forward,
// install, build, verify); a failure rolls back to the old commit and rebuilds
// it. Run by `npm run update` and by server.js on production starts (AUTO_UPDATE).
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REMOTE = 'origin';
const BRANCH = 'main';
const KEEP_BACKUPS = 5;
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const defaultRun = (command, args, { cwd, timeout = 10 * 60_000, quiet = false } = {}) =>
  execFileSync(command, args, { cwd, timeout, encoding: 'utf8', stdio: quiet ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'] }) ?? '';

// What an update runs; tests replace them.
export const DEFAULT_STEPS = {
  install: ['npm', ['ci', '--include=dev', '--no-audit', '--no-fund']],
  build: ['npm', ['run', 'build']],
  // .env complete (env.js throws on a missing value), the build there and
  // parseable on the TV browsers.
  verify: [
    ['node', ['--input-type=module', '-e', "await import('./src/server/config/env.js')"]],
    ['node', ['-e', "require('fs').accessSync('dist/index.html')"]],
    ['npm', ['run', 'check:legacy']]
  ]
};

const resolveCommand = command => (command === 'npm' ? NPM : command === 'node' ? process.execPath : command);

function backupDatabases({ cwd, backupDir, label, log }) {
  const source = path.join(cwd, 'db');
  if (!fs.existsSync(source)) return null;
  const dir = path.resolve(cwd, backupDir);
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, `db-${new Date().toISOString().replace(/[:.]/g, '-')}-${label}`);
  fs.cpSync(source, target, { recursive: true });
  // Only the newest few stay.
  const old = fs.readdirSync(dir).filter(name => name.startsWith('db-')).sort().slice(0, -KEEP_BACKUPS);
  old.forEach(name => fs.rmSync(path.join(dir, name), { recursive: true, force: true }));
  log(`databases backed up: ${path.relative(cwd, target) || target}`);
  return target;
}

// Resolves with { status, from, to, reason }: 'up-to-date', 'updated',
// 'skipped' (not on main, local changes, offline …) or 'failed' (rolled back).
export function runUpdate({
  cwd = ROOT,
  steps = DEFAULT_STEPS,
  run = defaultRun,
  backupDir = process.env.UPDATE_BACKUP_DIR || 'backups',
  log = message => console.log(`[Update] ${message}`)
} = {}) {
  const git = (...args) => String(run('git', args, { cwd, quiet: true, timeout: 60_000 })).trim();
  const exec = ([command, args]) => run(resolveCommand(command), args, { cwd });

  try {
    git('rev-parse', '--is-inside-work-tree');
  } catch {
    return { status: 'skipped', reason: 'not a git checkout' };
  }
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  if (branch !== BRANCH) return { status: 'skipped', reason: `on branch ${branch}, not ${BRANCH}` };
  if (git('status', '--porcelain', '--untracked-files=no')) return { status: 'skipped', reason: 'local changes to tracked files' };

  try {
    git('fetch', '--quiet', REMOTE, BRANCH);
  } catch (error) {
    return { status: 'skipped', reason: `${REMOTE} not reachable (${String(error.message).split('\n')[0]})` };
  }
  const from = git('rev-parse', 'HEAD');
  const to = git('rev-parse', `${REMOTE}/${BRANCH}`);
  if (from === to) return { status: 'up-to-date', from, to };
  try {
    git('merge-base', '--is-ancestor', 'HEAD', `${REMOTE}/${BRANCH}`);
  } catch {
    return { status: 'skipped', reason: `local commits that are not on ${REMOTE}/${BRANCH}` };
  }

  // Nothing has changed in the checkout yet: anything failing here (a file
  // in the way of the merge, a full disk for the backup) leaves the old
  // state as it is.
  let dependenciesChanged;
  try {
    const changed = git('diff', '--name-only', from, to).split('\n').filter(Boolean);
    dependenciesChanged = changed.some(file => file === 'package.json' || file === 'package-lock.json');
    log(`${from.slice(0, 7)} → ${to.slice(0, 7)}: ${changed.length} file(s) changed`);

    backupDatabases({ cwd, backupDir, label: from.slice(0, 7), log });
    git('merge', '--ff-only', '--quiet', `${REMOTE}/${BRANCH}`);
  } catch (error) {
    return { status: 'skipped', from, to, reason: `update not applied (${String(error.message).split('\n')[0]})` };
  }

  const buildAndVerify = () => {
    if (dependenciesChanged) {
      log('dependencies changed: npm ci');
      exec(steps.install);
    }
    log('building …');
    exec(steps.build);
    log('checking .env, build and syntax …');
    steps.verify.forEach(exec);
  };

  try {
    buildAndVerify();
  } catch (error) {
    const reason = String(error.message).split('\n')[0];
    log(`failed (${reason}), back to ${from.slice(0, 7)}`);
    try {
      git('reset', '--hard', '--quiet', from);
      buildAndVerify();
    } catch (rollbackError) {
      log(`the previous version did not build either: ${String(rollbackError.message).split('\n')[0]}`);
    }
    return { status: 'failed', from, to, reason };
  }

  log(`updated to ${to.slice(0, 7)}`);
  return { status: 'updated', from, to };
}

// On server start (server.js): only in production, unless AUTO_UPDATE=false;
// a process started by this update skips it. After an update the new code
// must run: pm2 restarts the process when it exits, otherwise it starts
// itself again and passes signals on.
export async function updateOnStart({ env = process.env } = {}) {
  dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });
  const production = (env.NODE_ENV || 'development') === 'production';
  if (!production || env.AUTO_UPDATE === 'false' || env.VANTA_UPDATED === '1') return;

  // Whatever goes wrong in the update, the server starts on what it has.
  let result;
  try {
    result = runUpdate();
  } catch (error) {
    result = { status: 'skipped', reason: String(error?.message || error).split('\n')[0] };
  }
  if (result.status === 'skipped') console.log(`[Update] skipped: ${result.reason}`);
  if (result.status !== 'updated') return;

  if (env.pm_id !== undefined) {
    console.log('[Update] restart by pm2 …');
    process.exit(0);
  }
  console.log('[Update] restarting …');
  const child = spawn(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...env, VANTA_UPDATED: '1' } });
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => child.kill(signal));
  child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
  // This process only waits for the new one.
  await new Promise(() => {});
}

// npm run update
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });
  const result = runUpdate();
  const messages = {
    'up-to-date': 'Already up to date.',
    updated: 'Done. A running server takes the update on its next restart (pm2 restart server).',
    skipped: `Skipped: ${result.reason}`,
    failed: `Failed: ${result.reason}. The previous version is built again.`
  };
  console.log(`[Update] ${messages[result.status]}`);
  process.exit(result.status === 'failed' ? 1 : 0);
}
