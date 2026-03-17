import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'types',
    environment: 'node',
    globals: false,
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
