export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Fingerprint {
  key: string;
  builder: string;
  builderArgs: unknown[];
  testId?: string;
  id?: string;
  role?: string;
  ariaLabel?: string;
  text?: string;
  labelText?: string;
  name?: string;
  placeholder?: string;
  tag: string;
  classList: string[];
  attributes: Record<string, string>;
  domPath: string;
  siblingIndex: number;
  boundingBox?: BoundingBox;
  updatedAt: string;
}

export interface FingerprintStore {
  version: 1;
  fingerprints: Record<string, Fingerprint>;
}
