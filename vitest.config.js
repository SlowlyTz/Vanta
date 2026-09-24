import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup/webStorage.js'],
    exclude: ['node_modules', 'src/public/vendor']
  }
});
