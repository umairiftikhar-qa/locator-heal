import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import type { Fingerprint, FingerprintStore } from './schema';

const DEFAULT_STORE: FingerprintStore = {
  version: 1,
  fingerprints: {}
};

export function loadStore(path: string): FingerprintStore {
  if (!existsSync(path)) {
    return { ...DEFAULT_STORE, fingerprints: {} };
  }

  const raw = readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw) as FingerprintStore;
  if (parsed?.version !== 1 || typeof parsed !== 'object' || parsed === null) {
    throw new Error(`Unsupported fingerprint store version: ${parsed?.version}`);
  }
  return parsed;
}

export function saveStore(path: string, store: FingerprintStore): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(store, null, 2) + '\n', 'utf8');
}

export function getFingerprint(store: FingerprintStore, key: string): Fingerprint | undefined {
  return store.fingerprints[key];
}

export function putFingerprint(store: FingerprintStore, fingerprint: Fingerprint): void {
  store.fingerprints[fingerprint.key] = fingerprint;
}
