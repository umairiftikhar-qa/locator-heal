import type { HealerInternalOptions } from './types';

export const DEFAULT_OPTIONS: HealerInternalOptions = {
  store: './.heal/fingerprints.json',
  confidenceThreshold: 0.6,
  mode: 'heal',
  reporter: 'console'
};
