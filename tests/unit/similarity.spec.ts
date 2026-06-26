import { describe, expect, it } from 'vitest';
import { diceCoefficient, jaroWinkler, normalizeString } from '../../src/scoring/similarity';

describe('similarity helpers', () => {
  it('normalizes whitespace and casing', () => {
    expect(normalizeString('  Hello  WORLD ')).toBe('hello world');
  });

  it('dice coefficient returns 1 for identical strings', () => {
    expect(diceCoefficient('hello', 'hello')).toBe(1);
  });

  it('dice coefficient returns > 0 for similar strings', () => {
    expect(diceCoefficient('checkout', 'check out')).toBeGreaterThan(0.5);
  });

  it('jaro winkler returns 1 for identical strings', () => {
    expect(jaroWinkler('submit', 'submit')).toBe(1);
  });

  it('jaro winkler returns 0 for totally different strings', () => {
    expect(jaroWinkler('button', 'email')).toBe(0);
  });
});
