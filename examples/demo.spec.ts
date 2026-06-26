import { test } from '@playwright/test';
import { createHealer } from '../src';

test('locator heal demo', async ({ page }) => {
  const heal = createHealer(page, { store: './.heal/fingerprints.json' });
  await page.goto('https://example.com');
  await heal.getByText('More information').click();
});
