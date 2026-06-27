import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: [
      'src/player/tests/unit/**/*.test.js',
      'src/server/**/*.test.js',
      'src/public/js/**/*.test.js'
    ],
    exclude: ['node_modules', 'src/public/vendor']
  }
});
