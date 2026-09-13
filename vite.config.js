import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src/public');

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
    rollupOptions: {
      input: path.resolve(appRoot, 'index.html')
    }
  }
});
