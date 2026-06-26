# locator-heal

Offline self-healing + actionable heal reports for Playwright locators.

`locator-heal` wraps Playwright locators and records element fingerprints so that repaired selectors can be used automatically when the DOM changes. Every heal is logged and surfaced in a report so selector rot is visible, not hidden.

## Install

```bash
npm install --save-dev locator-heal
```

## Quickstart

```ts
import { test } from '@playwright/test';
import { createHealer } from 'locator-heal';

test('checkout flow', async ({ page }) => {
  const heal = createHealer(page, { store: './.heal/fingerprints.json' });

  await heal.getByTestId('checkout-btn').click();
  await heal.getByRole('button', { name: 'Checkout' }).click();
  await heal.getByText('Submit').click();
  await heal.locator('#promo').fill('SAVE10');
});
```

## How healing works

`locator-heal` captures stable signals from resolved elements, including `data-testid`, `id`, `role`, `aria-label`, visible text, labels, and a DOM path. When a locator fails, it searches the live DOM for candidates, scores them with stable signals weighted highest, and chooses the best match above the configured confidence threshold.

## Reporters

- `console` — logs every heal immediately and prints a summary at flush time.
- `json` — writes `./.heal/report.json` after flush.
- `none` — disables output but keeps events available from `healer.report()`.

## Modes

- `heal` — default; try the locator and heal on failure.
- `record-only` — only capture fingerprints, do not heal.
- `off` — pure Playwright passthrough.

## Config

| option | type | default | meaning |
| --- | --- | --- | --- |
| `store` | `string` | `./.heal/fingerprints.json` | fingerprint JSON file path |
| `confidenceThreshold` | `number` | `0.6` | minimum score to accept a heal |
| `mode` | `'heal' | 'record-only' | 'off'` | `'heal'` | behavior switch |
| `onHeal` | `(event) => void` | `undefined` | callback fired for each heal |
| `reporter` | `'console' | 'json' | 'none'` | `'console'` | end-of-run report sink |

## What it does NOT do (yet)

- no LLM fallback
- no visual/screenshot-based matching
- no framework support beyond Playwright

## Example

Run the demo spec with Playwright:

```bash
npx playwright test examples/demo.spec.ts
```

## Notes

The fingerprint store is human-readable JSON. Commit it if you want repeatable heals, or add it to `.gitignore` if you prefer recording per branch.

## Readme toggle

If you want to make the project easier to discover on GitHub, enable the repository README preview toggle in the GitHub UI so the quickstart and install instructions show prominently on the landing page.
