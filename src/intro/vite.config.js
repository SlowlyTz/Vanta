import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const introRoot = path.dirname(fileURLToPath(import.meta.url));

// Bundles the opening scene together with three.js into one self-hosted
// module; the CSP only allows scripts from our own origin. This is a plain
// build rather than lib mode because Vite keeps ES lib output unminified.
export default defineConfig({
  root: introRoot,
  publicDir: false,
  build: {
    outDir: path.resolve(introRoot, '../public/vendor/intro'),
    emptyOutDir: true,
    sourcemap: false,
    minify: true,
    modulePreload: false,
    rollupOptions: {
      preserveEntrySignatures: 'strict',
      input: path.resolve(introRoot, 'src/index.js'),
      output: {
        format: 'es',
        entryFileNames: 'vanta-intro.js',
        chunkFileNames: '[name]-[hash].js',
        inlineDynamicImports: true
      }
    }
  }
});
