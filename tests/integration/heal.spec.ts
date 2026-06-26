import { expect, test } from '@playwright/test';
import { createHealer } from '../../src';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fixtures = resolve(__dirname, 'fixtures');
const storePath = resolve(__dirname, '.heal-fingerprints.json');

test.describe('locator-heal integration', () => {
  test('records fingerprints on v1 and heals on v2', async ({ page }) => {
    const healer = createHealer(page, { store: storePath, reporter: 'none', mode: 'record-only' });
    await page.goto(`file://${resolve(fixtures, 'v1.html')}`);
    await healer.locator('#checkout-btn').click();
    await healer.flush();

    const healer2 = createHealer(page, { store: storePath, reporter: 'none', mode: 'heal' });
    await page.goto(`file://${resolve(fixtures, 'v2.html')}`);
    await healer2.locator('#checkout-btn').click();
    const report = healer2.report();
    expect(report.events.length).toBeGreaterThan(0);
    expect(report.events[0].healedWith).toContain('getByTestId');
  });

  test('does not false-heal removed element', async ({ page }) => {
    const healer = createHealer(page, { store: storePath, reporter: 'none', mode: 'heal' });
    await page.goto(`file://${resolve(fixtures, 'v2-removed.html')}`);
    let error: Error | undefined;
    try {
      await healer.getByTestId('checkout-btn').click();
    } catch (err) {
      error = err as Error;
    }
    expect(error).toBeDefined();
    expect(error?.message).toContain('LocatorHeal: best candidate');
  });
});
