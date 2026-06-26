export function normalizeString(value: string | undefined): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase();
  return normalized.length === 0 ? undefined : normalized;
}

export function diceCoefficient(a: string, b: string): number {
  const normalizedA = normalizeString(a);
  const normalizedB = normalizeString(b);
  if (!normalizedA || !normalizedB) {
    return 0;
  }
  if (normalizedA === normalizedB) {
    return 1;
  }

  const bigrams = (text: string): string[] => {
    const pairs: string[] = [];
    for (let i = 0; i < text.length - 1; i += 1) {
      pairs.push(text.slice(i, i + 2));
    }
    return pairs;
  };

  const aPairs = bigrams(normalizedA);
  const bPairs = bigrams(normalizedB);
  if (aPairs.length === 0 || bPairs.length === 0) {
    return 0;
  }

  const intersection = aPairs.filter((pair) => bPairs.includes(pair)).length;
  return (2 * intersection) / (aPairs.length + bPairs.length);
}

export function jaroWinkler(a: string, b: string): number {
  const s1 = normalizeString(a) ?? '';
  const s2 = normalizeString(b) ?? '';
  if (s1.length === 0 || s2.length === 0) {
    return 0;
  }
  if (s1 === s2) {
    return 1;
  }

  const matchDistance = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const matches1 = new Array(s1.length).fill(false);
  const matches2 = new Array(s2.length).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i += 1) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, s2.length);
    for (let j = start; j < end; j += 1) {
      if (!matches2[j] && s1[i] === s2[j]) {
        matches1[i] = true;
        matches2[j] = true;
        matches += 1;
        break;
      }
    }
  }

  if (matches === 0) {
    return 0;
  }

  let k = 0;
  for (let i = 0; i < s1.length; i += 1) {
    if (!matches1[i]) {
      continue;
    }
    while (!matches2[k]) {
      k += 1;
    }
    if (s1[i] !== s2[k]) {
      transpositions += 1;
    }
    k += 1;
  }

  const m = matches;
  const t = transpositions / 2;
  const jaro = (m / s1.length + m / s2.length + (m - t) / m) / 3;
  const prefix = Math.min(4, commonPrefixLength(s1, s2));
  const scalingFactor = 0.1;
  return jaro + prefix * scalingFactor * (1 - jaro);
}

function commonPrefixLength(s1: string, s2: string): number {
  const length = Math.min(s1.length, s2.length, 4);
  let count = 0;
  for (let i = 0; i < length; i += 1) {
    if (s1[i] === s2[i]) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}
