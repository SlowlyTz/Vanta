import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src/public');

// Stylesheets the router loads with their page (js/utils/pageStyles.js): each
// bundle becomes its own hashed file, the manifest tells the server which.
const pageStyleBundles = fs.readdirSync(path.join(appRoot, 'css/bundles'))
  .filter(file => file.endsWith('.css'))
  .map(file => file.replace(/\.css$/, ''));

// Production build of the web app: bundles the stylesheets linked from
// index.html (in that order) and the ES modules behind app.js into hashed
// files under dist/, split at the dynamic route imports. The player and the
// opening scene have their own configs (src/player, src/intro) and keep their
// fixed /vendor paths, which the app loads by string at runtime.
export default defineConfig({
  root: appRoot,
  publicDir: false,
  build: {
    outDir: path.resolve(appRoot, '../../dist'),
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    // The minifier rewrites hsl() colours as hex, which shifts gradients by a
    // few 8-bit steps; the bundled CSS stays verbatim so rendering is identical.
    cssMinify: false,
    manifest: true,
    rollupOptions: {
      input: {
        index: path.resolve(appRoot, 'index.html'),
        ...Object.fromEntries(pageStyleBundles.map(name => [`page-${name}`, path.resolve(appRoot, `css/bundles/${name}.css`)]))
      }
    }
  }
});
