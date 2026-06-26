import { describe, expect, it } from 'vitest';
import { scoreFingerprint } from '../../src/scoring/score';
import type { Fingerprint } from '../../src/fingerprint/schema';

describe('scorer', () => {
  const base: Fingerprint = {
    key: 'getByTestId:checkout-btn',
    builder: 'getByTestId',
    builderArgs: ['checkout-btn'],
    testId: 'checkout-btn',
    id: 'checkout',
    role: 'button',
    ariaLabel: 'Checkout',
    text: 'Checkout',
    labelText: undefined,
    name: undefined,
    placeholder: undefined,
    tag: 'button',
    classList: ['btn', 'btn-primary'],
    attributes: { type: 'button' },
    domPath: 'body > div > button',
    siblingIndex: 0,
    boundingBox: { x: 10, y: 10, w: 100, h: 40 },
    updatedAt: new Date().toISOString()
  };

  it('scores exact testId match highest', () => {
    const candidate = { testId: 'checkout-btn' };
    const result = scoreFingerprint(base, candidate);
    expect(result.score).toBeGreaterThan(0.25);
    expect(result.breakdown.testId).toBe(1);
  });

  it('gracefully handles missing signals', () => {
    const candidate = { role: 'button' };
    const result = scoreFingerprint(base, candidate);
    expect(result.score).toBeGreaterThan(0.1);
    expect(result.breakdown.role).toBe(1);
    expect(result.breakdown.testId).toBe(0);
  });

  it('low score for different element', () => {
    const candidate = { testId: 'wrong', text: 'Cancel' };
    const result = scoreFingerprint(base, candidate);
    expect(result.score).toBeLessThan(0.3);
  });

  it('still matches on changed text with same role and id', () => {
    const candidate = { id: 'checkout', role: 'button', text: 'Pay now' };
    const result = scoreFingerprint(base, candidate);
    expect(result.score).toBeGreaterThan(0.4);
  });
});
