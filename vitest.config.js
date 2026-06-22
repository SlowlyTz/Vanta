import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'src/player/tests/unit/**/*.test.js',
      'src/server/**/*.test.js'
    ],
    exclude: ['node_modules', 'src/public/vendor']
  }
});
