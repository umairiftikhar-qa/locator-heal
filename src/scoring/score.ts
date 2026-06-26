import type { BoundingBox, Fingerprint } from '../fingerprint/schema';
import { SIGNAL_WEIGHTS, SignalKey } from './weights';
import { diceCoefficient, jaroWinkler, normalizeString } from './similarity';

export interface ScoreBreakdown {
  [signal: string]: number;
}

export interface ScoreResult {
  score: number;
  breakdown: ScoreBreakdown;
}

export function scoreFingerprint(fingerprint: Fingerprint, candidate: Partial<Fingerprint>): ScoreResult {
  let weightedMatch = 0;
  let weightedApplicable = 0;
  const breakdown: ScoreBreakdown = {};

  const signalHandlers: Record<SignalKey, (value: any, candidateValue: any) => number> = {
    testId: exactMatch,
    id: exactMatch,
    role: exactMatch,
    ariaLabel: fuzzyStringMatch,
    text: fuzzyStringMatch,
    labelText: fuzzyStringMatch,
    name: exactMatch,
    placeholder: fuzzyOrExactStringMatch,
    tag: exactMatch,
    classList: classListScore,
    domPath: domPathScore,
    siblingIndex: siblingIndexScore,
    boundingBox: boundingBoxScore
  };

  for (const signal of Object.keys(SIGNAL_WEIGHTS) as SignalKey[]) {
    const weight = SIGNAL_WEIGHTS[signal];
    const value = fingerprint[signal];
    const candidateValue = candidate[signal];
    if (value === undefined && candidateValue === undefined) {
      continue;
    }
    weightedApplicable += weight;
    const signalScore = signalHandlers[signal](value, candidateValue);
    weightedMatch += signalScore * weight;
    breakdown[signal] = Number(signalScore.toFixed(3));
  }

  const score = weightedApplicable === 0 ? 0 : weightedMatch / weightedApplicable;
  return { score, breakdown };
}

function exactMatch(a: string | undefined, b: string | undefined): number {
  if (a === undefined || b === undefined) {
    return 0;
  }
  return normalizeString(a) === normalizeString(b) ? 1 : 0;
}

function fuzzyStringMatch(a: string | undefined, b: string | undefined): number {
  const normalizedA = normalizeString(a);
  const normalizedB = normalizeString(b);
  if (!normalizedA || !normalizedB) {
    return 0;
  }

  if (normalizedA === normalizedB) {
    return 1;
  }
  return Math.max(diceCoefficient(normalizedA, normalizedB), jaroWinkler(normalizedA, normalizedB));
}

function fuzzyOrExactStringMatch(a: string | undefined, b: string | undefined): number {
  const exact = exactMatch(a, b);
  if (exact === 1) {
    return 1;
  }
  return fuzzyStringMatch(a, b);
}

function classListScore(a: string[] | undefined, b: string[] | undefined): number {
  if (!a || !b || a.length === 0 || b.length === 0) {
    return 0;
  }
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = Array.from(setA).filter((value) => setB.has(value)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function domPathScore(a: string | undefined, b: string | undefined): number {
  if (!a || !b) {
    return 0;
  }
  return a === b ? 1 : 0.2;
}

function siblingIndexScore(a: number | undefined, b: number | undefined): number {
  if (a === undefined || b === undefined) {
    return 0;
  }
  return a === b ? 1 : Math.max(0, 1 - Math.abs(a - b) / 10);
}

function boundingBoxScore(a: BoundingBox | undefined, b: BoundingBox | undefined): number {
  if (!a || !b) {
    return 0;
  }
  const positionDistance = Math.hypot(a.x - b.x, a.y - b.y);
  const sizeSimilarity = 1 - Math.abs(a.w - b.w) / Math.max(a.w, b.w, 1) - Math.abs(a.h - b.h) / Math.max(a.h, b.h, 1);
  const normalizedDistance = Math.max(0, 1 - positionDistance / 500);
  return Math.max(0, (normalizedDistance + sizeSimilarity) / 2);
}
