// Shared store primitives: the bbox tuple type, bbox geometry helpers, and a
// collision-resistant id generator. Kept dependency-free so every other store
// module can import from here without creating cycles.

export type Bbox4 = [number, number, number, number];

export const bboxContains = (outer: Bbox4, inner: Bbox4): boolean =>
  outer[0] <= inner[0] &&
  outer[1] <= inner[1] &&
  outer[2] >= inner[2] &&
  outer[3] >= inner[3];

export const expandBbox = (b: Bbox4, factor = 0.5): Bbox4 => {
  const dx = (b[2] - b[0]) * factor * 0.5;
  const dy = (b[3] - b[1]) * factor * 0.5;
  return [b[0] - dx, b[1] - dy, b[2] + dx, b[3] + dy];
};

export const parseBbox = (s: string): Bbox4 => {
  const [a, b, c, d] = s.split(',').map(Number);
  return [a, b, c, d];
};

export const genId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `z_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
