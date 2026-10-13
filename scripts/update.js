import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Updates this checkout from origin/main: fetch, back up db/, fast-forward,
// install when the dependencies changed, build, verify. A failed build or
// check puts the old commit back and builds it again, so the server always
// starts on something that works.
//
//   npm run update     update now, do not start the server
//   server.js          runs it on every start in production (AUTO_UPDATE)

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
  log(`Datenbanken gesichert: ${path.relative(cwd, target) || target}`);
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
    return { status: 'skipped', reason: 'kein Git-Checkout' };
  }
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
  if (branch !== BRANCH) return { status: 'skipped', reason: `Branch ${branch} statt ${BRANCH}` };
  if (git('status', '--porcelain', '--untracked-files=no')) return { status: 'skipped', reason: 'lokale Änderungen an versionierten Dateien' };

  try {
    git('fetch', '--quiet', REMOTE, BRANCH);
  } catch (error) {
    return { status: 'skipped', reason: `${REMOTE} nicht erreichbar (${String(error.message).split('\n')[0]})` };
  }
  const from = git('rev-parse', 'HEAD');
  const to = git('rev-parse', `${REMOTE}/${BRANCH}`);
  if (from === to) return { status: 'up-to-date', from, to };
  try {
    git('merge-base', '--is-ancestor', 'HEAD', `${REMOTE}/${BRANCH}`);
  } catch {
    return { status: 'skipped', reason: `lokale Commits, die nicht auf ${REMOTE}/${BRANCH} sind` };
  }

  const changed = git('diff', '--name-only', from, to).split('\n').filter(Boolean);
  const dependenciesChanged = changed.some(file => file === 'package.json' || file === 'package-lock.json');
  log(`${from.slice(0, 7)} → ${to.slice(0, 7)}: ${changed.length} Datei(en) geändert`);

  backupDatabases({ cwd, backupDir, label: from.slice(0, 7), log });
  git('merge', '--ff-only', '--quiet', `${REMOTE}/${BRANCH}`);

  const buildAndVerify = () => {
    if (dependenciesChanged) {
      log('Abhängigkeiten geändert: npm ci');
      exec(steps.install);
    }
    log('Baue …');
    exec(steps.build);
    log('Prüfe .env, Build und Syntax …');
    steps.verify.forEach(exec);
  };

  try {
    buildAndVerify();
  } catch (error) {
    const reason = String(error.message).split('\n')[0];
    log(`Fehlgeschlagen (${reason}), zurück auf ${from.slice(0, 7)}`);
    try {
      git('reset', '--hard', '--quiet', from);
      buildAndVerify();
    } catch (rollbackError) {
      log(`Auch der alte Stand ließ sich nicht bauen: ${String(rollbackError.message).split('\n')[0]}`);
    }
    return { status: 'failed', from, to, reason };
  }

  log(`Aktualisiert auf ${to.slice(0, 7)}`);
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

  const result = runUpdate();
  if (result.status === 'skipped') console.log(`[Update] übersprungen: ${result.reason}`);
  if (result.status !== 'updated') return;

  if (env.pm_id !== undefined) {
    console.log('[Update] Neustart durch pm2 …');
    process.exit(0);
  }
  console.log('[Update] Starte neu …');
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
    'up-to-date': 'Schon aktuell.',
    updated: 'Fertig. Ein laufender Server übernimmt das Update erst nach einem Neustart (pm2 restart server).',
    skipped: `Übersprungen: ${result.reason}`,
    failed: `Fehlgeschlagen: ${result.reason}. Der alte Stand ist wieder gebaut.`
  };
  console.log(`[Update] ${messages[result.status]}`);
  process.exit(result.status === 'failed' ? 1 : 0);
}
