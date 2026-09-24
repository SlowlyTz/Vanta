import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const countdownRoot = path.dirname(fileURLToPath(import.meta.url));

// Bundles the watch-party countdown together with three.js into one
// self-hosted module, like the opening scene (the CSP only allows scripts
// from our own origin). Loaded on demand when a party reaches the ready phase.
export default defineConfig({
  root: countdownRoot,
  publicDir: false,
  build: {
    outDir: path.resolve(countdownRoot, '../public/vendor/countdown'),
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    modulePreload: false,
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      input: path.resolve(countdownRoot, 'src/index.js'),
      output: {
        format: 'es',
        entryFileNames: 'vanta-countdown.js',
        chunkFileNames: '[name]-[hash].js',
        inlineDynamicImports: true
      }
    }
  }
});
