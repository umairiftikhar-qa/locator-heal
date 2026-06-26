import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.spec.ts'],
    exclude: ['tests/integration/**', 'examples/**', 'verify-heal.spec.ts'],
  },
});
