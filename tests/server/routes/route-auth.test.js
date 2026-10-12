import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';

// Static guard: every API route needs requireAuth (on the route or for the
// whole router) unless it is listed here on purpose.
const ROUTES_DIR = resolve(process.cwd(), 'src/server/routes');

const PUBLIC_ROUTES = new Set([
  'auth.routes.js POST /login',
  'auth.routes.js GET /me',
  'auth.routes.js POST /logout',
  'page.routes.js GET *',
  'version.routes.js GET /',
  'health.routes.js GET /',
  // The TV asks for a pairing code and its status before anyone is signed in.
  'pairing.routes.js POST /',
  'pairing.routes.js GET /status'
]);

// Routers that guard every route themselves (internal: loopback + key).
const SELF_GUARDED = new Set(['internal.routes.js']);

const listFiles = (dir) => readdirSync(dir).flatMap(name => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? listFiles(full) : [full];
});

const ROUTE_PATTERN = /router\.(get|post|put|patch|delete)\(\s*'([^']+)'\s*,([^\n]*)/g;

describe('API routes require a session', () => {
  const files = listFiles(ROUTES_DIR).filter(file => file.endsWith('.routes.js'));

  it('finds the route files', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files.map(file => [relative(ROUTES_DIR, file), file]))('%s', (name, file) => {
    if (SELF_GUARDED.has(name)) return;
    const source = readFileSync(file, 'utf8');
    if (/router\.use\(\s*requireAuth/.test(source)) return;

    const open = [];
    for (const [, method, path, rest] of source.matchAll(ROUTE_PATTERN)) {
      const key = `${name} ${method.toUpperCase()} ${path}`;
      if (!rest.includes('requireAuth') && !PUBLIC_ROUTES.has(key)) open.push(key);
    }
    expect(open).toEqual([]);
  });
});
