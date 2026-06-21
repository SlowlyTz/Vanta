import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/player/tests/unit/**/*.test.js'],
    exclude: ['node_modules', 'src/public/vendor']
  }
});
