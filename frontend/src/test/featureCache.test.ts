// Pure-logic tests for the per-layer feature cache (dedup + coverage) and the
// bbox geometry helpers. Pins behaviour moved into stores/featureCache.ts by
// Workstream A.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  useFeatureCacheStore,
  bboxContains,
  expandBbox,
  parseBbox,
  type Bbox4,
} from '../store';
import { makeFeature } from './factories';

const FULL: Bbox4 = [0, 0, 10, 10];

beforeEach(() => useFeatureCacheStore.setState({ features: {}, covered: {} }));

describe('addBatch dedup', () => {
  it('dedupes by feature id across batches', () => {
    const f = makeFeature({ id: 'x1' });
    const s = useFeatureCacheStore.getState();
    s.addBatch('mml', FULL, [f]);
    s.addBatch('mml', FULL, [{ ...f }]); // same id, new object
    expect(useFeatureCacheStore.getState().features.mml).toHaveLength(1);
  });

  it('dedupes by stable provider property keys (osm_id, mtk_id, ...)', () => {
    const s = useFeatureCacheStore.getState();
    s.addBatch('osm', FULL, [makeFeature({ properties: { osm_id: 42 } })]);
    s.addBatch('osm', FULL, [makeFeature({ properties: { osm_id: 42 } })]);
    expect(useFeatureCacheStore.getState().features.osm).toHaveLength(1);
  });

  it('falls back to a geometry hash when no id/props are present', () => {
    const s = useFeatureCacheStore.getState();
    const geom = { type: 'Point' as const, coordinates: [5, 5] };
    s.addBatch('mml', FULL, [{ type: 'Feature', geometry: geom, properties: {} }]);
    s.addBatch('mml', FULL, [{ type: 'Feature', geometry: geom, properties: {} }]);
    expect(useFeatureCacheStore.getState().features.mml).toHaveLength(1);
  });

  it('keeps distinct geometries as separate entries', () => {
    const s = useFeatureCacheStore.getState();
    s.addBatch('mml', FULL, [makeFeature(), makeFeature()]);
    expect(useFeatureCacheStore.getState().features.mml).toHaveLength(2);
  });

  it('accumulates covered bboxes per layer', () => {
    const s = useFeatureCacheStore.getState();
    s.addBatch('mml', [0, 0, 5, 5], [makeFeature()]);
    s.addBatch('mml', [5, 5, 10, 10], [makeFeature()]);
    expect(useFeatureCacheStore.getState().covered.mml).toHaveLength(2);
  });
});

describe('clear / clearAll / injectSnapshots', () => {
  it('clear empties a single layer only', () => {
    const s = useFeatureCacheStore.getState();
    s.addBatch('mml', FULL, [makeFeature()]);
    s.addBatch('osm', FULL, [makeFeature()]);
    s.clear('mml');
    const st = useFeatureCacheStore.getState();
    expect(st.features.mml).toEqual([]);
    expect(st.features.osm).toHaveLength(1);
  });

  it('clearAll wipes every layer', () => {
    const s = useFeatureCacheStore.getState();
    s.addBatch('mml', FULL, [makeFeature()]);
    s.clearAll();
    expect(useFeatureCacheStore.getState().features).toEqual({});
  });

  it('injectSnapshots loads features and marks coverage', () => {
    useFeatureCacheStore.getState().injectSnapshots(
      { mml: { features: [makeFeature(), makeFeature()] } },
      FULL,
    );
    const st = useFeatureCacheStore.getState();
    expect(st.features.mml).toHaveLength(2);
    expect(st.covered.mml).toEqual([FULL]);
  });
});

describe('bbox helpers', () => {
  it('bboxContains is true only when inner sits inside outer', () => {
    expect(bboxContains([0, 0, 10, 10], [2, 2, 8, 8])).toBe(true);
    expect(bboxContains([0, 0, 10, 10], [2, 2, 12, 8])).toBe(false);
  });

  it('expandBbox grows the box outward symmetrically', () => {
    const out = expandBbox([0, 0, 10, 10], 0.5);
    expect(out[0]).toBeLessThan(0);
    expect(out[2]).toBeGreaterThan(10);
  });

  it('parseBbox parses a comma string into four numbers', () => {
    expect(parseBbox('1,2,3,4')).toEqual([1, 2, 3, 4]);
  });
});
