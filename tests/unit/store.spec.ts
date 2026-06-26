import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, readFileSync } from 'node:fs';
import { loadStore, saveStore } from '../../src/fingerprint/store';

describe('fingerprint store', () => {
  const tempPath = './temp-fingerprint-store.json';

  afterEach(() => {
    if (existsSync(tempPath)) {
      rmSync(tempPath);
    }
  });

  it('writes and reads a store file', () => {
    const store = {
      version: 1,
      fingerprints: {
        'getByTestId:checkout-btn': {
          key: 'getByTestId:checkout-btn',
          builder: 'getByTestId',
          builderArgs: ['checkout-btn'],
          tag: 'button',
          classList: [],
          attributes: {},
          domPath: 'body > button',
          siblingIndex: 0,
          updatedAt: new Date().toISOString()
        }
      }
    };

    saveStore(tempPath, store);
    expect(existsSync(tempPath)).toBe(true);
    const loaded = loadStore(tempPath);
    expect(loaded.version).toBe(1);
    expect(loaded.fingerprints['getByTestId:checkout-btn']).toEqual(store.fingerprints['getByTestId:checkout-btn']);
  });

  it('returns an empty store when the file is missing', () => {
    const loaded = loadStore('./does-not-exist.json');
    expect(loaded.version).toBe(1);
    expect(loaded.fingerprints).toEqual({});
  });
});
