import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const playerRoot = path.dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

export default defineConfig({
  root: playerRoot,
  publicDir: false,
  build: {
    outDir: path.resolve(playerRoot, '../public/vendor/player'),
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: isWatch,
    lib: {
      entry: path.resolve(playerRoot, 'src/index.js'),
      formats: ['es'],
      fileName: () => 'vanta-player.js'
    },
    rollupOptions: {
      output: {
        assetFileNames: assetInfo =>
          assetInfo.name?.endsWith('.css') ? 'vanta-player.css' : 'assets/[name][extname]'
      }
    }
  }
});
