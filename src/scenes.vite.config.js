import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const srcRoot = path.dirname(fileURLToPath(import.meta.url));

// Builds both three.js scenes, the opening scene (src/intro) and the
// watch-party countdown (src/countdown), in one go, so three.js and the
// shared particle code land in one hashed chunk they share instead of being
// bundled twice. The entries keep fixed names because the app imports them
// by URL (js/intro-gate.js, pages/watch-party/helpers.js); the CSP only
// allows scripts from our own origin, so everything is self-hosted. A plain
// build rather than lib mode because Vite keeps ES lib output unminified.
export default defineConfig({
  root: srcRoot,
  publicDir: false,
  build: {
    outDir: path.resolve(srcRoot, 'public/vendor/scenes'),
    // TV browsers (Chromium 68) parse it too, even though the intro is off there.
    target: 'chrome68',
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    modulePreload: false,
    // three.js alone is about 530 kB; it is one shared, cached chunk.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      input: {
        'vanta-intro': path.resolve(srcRoot, 'intro/src/index.js'),
        'vanta-countdown': path.resolve(srcRoot, 'countdown/src/index.js')
      },
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        manualChunks: (id) => {
          if (id.includes('node_modules/three') || id.includes('/src/shared/particles/')) return 'three';
          return undefined;
        }
      }
    }
  }
});
