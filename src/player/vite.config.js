import { defineConfig } from 'vite';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const playerRoot = path.dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');
const require = createRequire(import.meta.url);

// hls.js only moves its transmuxing off the main thread when it can load a
// worker file; the ESM build carries none, so the matching worker from the
// same package ships next to the player (see HLS_WORKER_PATH).
const hlsWorker = () => ({
  name: 'vanta-hls-worker',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'hls.worker.js',
      source: readFileSync(require.resolve('hls.js/dist/hls.worker.js'))
    });
  }
});

export default defineConfig({
  root: playerRoot,
  publicDir: false,
  plugins: [hlsWorker()],
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
