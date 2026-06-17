import type { DistanceMetric, MatchConfig, MatchResult, ReferenceEntry } from './faceTypes';

export function euclidean(a: Float32Array | number[], b: Float32Array | number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function cosineDistance(a: Float32Array | number[], b: Float32Array | number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 1;
  return 1 - dot / denom;
}

export function distance(a: Float32Array | number[], b: Float32Array | number[], metric: DistanceMetric): number {
  return metric === 'cosine' ? cosineDistance(a, b) : euclidean(a, b);
}

export function findMatches(
  query: Float32Array,
  references: ReferenceEntry[],
  cfg: MatchConfig
): MatchResult[] {
  const scored: MatchResult[] = references.map((entry) => ({
    entry,
    distance: distance(query, entry.descriptor, cfg.metric),
  }));

  scored.sort((a, b) => a.distance - b.distance);

  return scored.slice(0, cfg.topN);
}

export function isConfidentMatch(result: MatchResult, cfg: MatchConfig): boolean {
  return result.distance <= cfg.distanceThreshold;
}
