import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/integration',
  retries: 0,
  use: {
    headless: true,
    ignoreHTTPSErrors: true
  }
});
