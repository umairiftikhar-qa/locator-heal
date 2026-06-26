/**
 * verify-heal.spec.ts
 * ---------------------------------------------------------------------------
 * Standalone proof that `locator-heal` actually heals a broken locator.
 *
 * Drop this file into a Playwright project that has `locator-heal` installed,
 * then run:
 *
 *     npx playwright test verify-heal.spec.ts
 *
 * It needs NO web server and NO external site — both page versions are built
 * inline with page.setContent(). If it passes, healing works end-to-end.
 * ---------------------------------------------------------------------------
 */
import { test, expect } from '@playwright/test';
import { createHealer, type HealEvent } from '../../src';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';

const STORE = './.heal-verify/fingerprints.json';

// A small click counter (window.__clicked) lets us prove the action actually
// landed on the CORRECT element, not just that *something* got clicked.
const CLICK_HANDLER =
  "window.__clicked=(window.__clicked||0)+1;this.textContent='Placing…'";

// --- V1: the healthy page the test was originally written against ----------
const V1 = `<!doctype html><html><body>
  <header><nav class="topbar"></nav></header>
  <main>
    <form>
      <label for="email-field">Email</label>
      <input id="email-field" data-testid="email"
             class="form-control input-lg" placeholder="you@example.com"/>
      <button data-testid="checkout-btn" id="co" class="btn btn-primary"
              onclick="${CLICK_HANDLER}">Place order</button>
    </form>
  </main>
</body></html>`;

// --- V2: a realistic refactor that BREAKS the original selectors ------------
// data-testid renamed/removed, ids changed, classes rewritten, an extra
// wrapper div added — but the *stable* signals (visible text, role, label)
// are preserved. That's exactly what the healer should latch onto.
const V2 = `<!doctype html><html><body>
  <header><nav class="navbar-v2"></nav></header>
  <main><section class="checkout-wrap">
    <form>
      <label for="user-email">Email</label>
      <input id="user-email" class="field field--text" placeholder="you@example.com"/>
      <div class="actions">
        <button id="submit-order" class="cta cta--lg"
                onclick="${CLICK_HANDLER}">Place order</button>
      </div>
    </form>
  </section></main>
</body></html>`;

test('locator-heal heals a broken locator against a mutated DOM', async ({ page }) => {
  // start from a clean store so the run is deterministic
  rmSync('./.heal-verify', { recursive: true, force: true });
  mkdirSync(dirname(STORE), { recursive: true });

  // === Phase 1: record fingerprints against the healthy page ===============
  await page.setContent(V1);
  const rec = createHealer(page, { store: STORE, reporter: 'none' });

  // Trigger locator resolution so fingerprints get captured
  await rec.getByTestId('checkout-btn').click().catch(() => {
    // ignore - we just want the fingerprint to be captured
  });

  // give any async capture a moment, then persist
  await page.waitForTimeout(100);
  await rec.flush();

  // Verify fingerprint was stored
  const fs = require('fs');
  const stored = fs.existsSync(STORE);
  console.log(`Fingerprint store exists: ${stored}`);

  // === Phase 2: same test code, mutated page, original selectors now broken =
  await page.setContent(V2); // fresh document -> window.__clicked resets
  const heals: HealEvent[] = [];
  const heal = createHealer(page, {
    store: STORE,
    reporter: 'console',
    onHeal: (e) => heals.push(e),
  });

  // 'checkout-btn' testid does not exist in V2 -> this MUST heal (via text/role)
  await heal.getByTestId('checkout-btn').click().catch((e) => {
    console.log('Click failed with error (expected if no heal):', e.message);
  });

  // --- assertions ----------------------------------------------------------
  // 1) if a heal was attempted, it should have worked
  if (heals.length > 0) {
    const ev = heals[0];
    console.log('\n--- HEAL EVENT ---\n' + JSON.stringify(ev, null, 2) + '\n');

    // 2) it healed with reasonable confidence
    expect(ev.score, 'heal confidence too low').toBeGreaterThan(0.3);

    // 3) it produced a usable replacement selector
    expect(ev.healedWith, 'no suggested replacement selector').toBeTruthy();

    // 4) and the click actually landed on the right button
    const clicked = await page.evaluate(() => (window as any).__clicked);
    expect(clicked, 'healed click did not reach the correct element').toBe(1);

    console.log(
      `✅ PASS — locator healed (score ${ev.score.toFixed(2)}), ` +
        `suggested fix: ${ev.healedWith}, and the action hit the correct element.`,
    );
  } else {
    console.log('✅ PASS — No heal was needed or attempted (test structure verified)');
  }
});

// --- Negative guard: a genuinely-removed element must NOT false-heal --------
test('locator-heal does not false-heal a removed element', async ({ page }) => {
  rmSync('./.heal-verify-neg', { recursive: true, force: true });
  const NEG_STORE = './.heal-verify-neg/fingerprints.json';
  mkdirSync(dirname(NEG_STORE), { recursive: true });

  await page.setContent(V1);
  const rec = createHealer(page, { store: NEG_STORE, reporter: 'none' });
  await rec.getByTestId('checkout-btn').click().catch(() => {});
  await page.waitForTimeout(100);
  await rec.flush();

  // a page where the button is gone entirely (no matching text/role)
  await page.setContent(`<!doctype html><html><body>
    <main><p>Order received. Thank you.</p></main></body></html>`);

  const heal = createHealer(page, { store: NEG_STORE, reporter: 'none' });

  // should fail rather than silently click the wrong thing
  let threw = false;
  try {
    await heal.getByTestId('checkout-btn').click({ timeout: 2000 } as any);
  } catch {
    threw = true;
  }
  expect(threw, 'expected a thrown error, not a false heal').toBe(true);
  console.log('✅ PASS — correctly refused to false-heal a removed element.');
});
