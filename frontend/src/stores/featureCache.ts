import { create } from 'zustand';
import type { Feature } from 'geojson';
import type { LayerKey } from '../api/types';
import type { Bbox4 } from './util';

// Per-layer feature cache. Features accumulate as the user pans the map,
// deduplicated by feature key, so that scrolling back over visited area
// is instant. `covered` tracks the bboxes we've successfully fetched; if
// the current viewport is contained in any of them we skip the request.
interface FeatureCacheState {
  features: Partial<Record<LayerKey, Feature[]>>;
  covered: Partial<Record<LayerKey, Bbox4[]>>;
  addBatch: (id: LayerKey, fetched: Bbox4, features: Feature[]) => void;
  clear: (id: LayerKey) => void;
  clearAll: () => void;
  /** Inject saved layer snapshots directly (bypass network fetch). */
  injectSnapshots: (snapshots: Record<string, { features: Feature[] }>, fileBbox?: Bbox4) => void;
}

// 32-bit FNV-1a hash — fast, no deps, good enough to dedupe geometries.
const hashStr = (s: string): string => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
};

const featureKey = (f: Feature): string => {
  if (f.id != null) return `id:${f.id}`;
  const props = (f.properties ?? {}) as Record<string, unknown>;
  // Try common stable identifiers across our providers.
  for (const k of ['mtk_id', 'osm_id', 'posti_alue', 'fid', 'gml_id', 'station_id', 'cell_id', 'cellid', 'satid']) {
    if (props[k] != null) return `${k}:${String(props[k])}`;
  }
  // Fallback: hash the full geometry so every distinct polygon gets a distinct key.
  return `g:${hashStr(JSON.stringify(f.geometry))}`;
};

export const useFeatureCacheStore = create<FeatureCacheState>((set) => ({
  features: {},
  covered: {},
  addBatch: (id, fetched, incoming) =>
    set((s) => {
      const existing = s.features[id] ?? [];
      const seen = new Set(existing.map(featureKey));
      const merged = existing.slice();
      for (const f of incoming) {
        const k = featureKey(f);
        if (!seen.has(k)) {
          seen.add(k);
          merged.push(f);
        }
      }
      const coveredList = s.covered[id] ?? [];
      return {
        features: { ...s.features, [id]: merged },
        covered: { ...s.covered, [id]: [...coveredList, fetched] },
      };
    }),
  clear: (id) =>
    set((s) => ({
      features: { ...s.features, [id]: [] },
      covered: { ...s.covered, [id]: [] },
    })),
  clearAll: () => set({ features: {}, covered: {} }),
  injectSnapshots: (snapshots, fileBbox) =>
    set((s) => {
      const features = { ...s.features };
      const covered = { ...s.covered };
      const coverageBbox: Bbox4 = fileBbox ?? [-180, -90, 180, 90];
      for (const [id, fc] of Object.entries(snapshots)) {
        if (fc && Array.isArray(fc.features)) {
          features[id as LayerKey] = fc.features as Feature[];
          covered[id as LayerKey] = [coverageBbox];
        }
      }
      return { features, covered };
    }),
}));
