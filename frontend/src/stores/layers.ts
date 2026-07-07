import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LayerKey, LayerStatus } from '../api/types';
import { ALL_OSM_POI_CATEGORIES, type OsmPoiCategory } from '../map/osmPoi';

// ---------- Active layer set + per-layer status ----------
interface LayerState {
  active: Partial<Record<LayerKey, boolean>>;
  status: Partial<Record<LayerKey, LayerStatus>>;
  loading: Partial<Record<LayerKey, boolean>>;
  toggle: (id: LayerKey) => void;
  setStatus: (id: LayerKey, status: LayerStatus) => void;
  setLoading: (id: LayerKey, loading: boolean) => void;
  /** Replace the full active-layer set. Used when loading a saved plan. */
  setActiveLayers: (ids: LayerKey[]) => void;
}

export const useLayerStore = create<LayerState>((set) => ({
  active: {},
  status: {},
  loading: {},
  toggle: (id) =>
    set((s) => ({ active: { ...s.active, [id]: !s.active[id] } })),
  setStatus: (id, status) =>
    set((s) => ({ status: { ...s.status, [id]: status } })),
  setLoading: (id, loading) =>
    set((s) => ({ loading: { ...s.loading, [id]: loading } })),
  setActiveLayers: (ids) =>
    set((s) => {
      const next: Partial<Record<LayerKey, boolean>> = {};
      for (const k of Object.keys(s.active) as LayerKey[]) next[k] = false;
      for (const id of ids) next[id] = true;
      return { active: next };
    }),
}));

// ---------- Layer config slots 1..5 (persisted) ----------
export interface LayerSlot {
  layers: LayerKey[];
  savedAt: number;
}

interface LayerSlotsState {
  slots: (LayerSlot | null)[];
  save: (i: number, slot: LayerSlot) => void;
  clear: (i: number) => void;
}

export const useLayerSlotsStore = create<LayerSlotsState>()(
  persist(
    (set) => ({
      slots: [null, null, null, null, null],
      save: (i, slot) =>
        set((s) => {
          const next = s.slots.slice();
          next[i] = slot;
          return { slots: next };
        }),
      clear: (i) =>
        set((s) => {
          const next = s.slots.slice();
          next[i] = null;
          return { slots: next };
        }),
    }),
    { name: 'ipb-layer-slots' },
  ),
);

// ---------- OSM POI category filters (persisted) ----------
interface OsmPoiFilterState {
  enabled: OsmPoiCategory[];
  toggle: (category: OsmPoiCategory) => void;
  setAll: () => void;
  clearAll: () => void;
}

export const useOsmPoiFilterStore = create<OsmPoiFilterState>()(
  persist(
    (set) => ({
      enabled: ALL_OSM_POI_CATEGORIES,
      toggle: (category) =>
        set((s) => {
          const has = s.enabled.includes(category);
          return {
            enabled: has ? s.enabled.filter((c) => c !== category) : [...s.enabled, category],
          };
        }),
      setAll: () => set({ enabled: ALL_OSM_POI_CATEGORIES }),
      clearAll: () => set({ enabled: [] }),
    }),
    { name: 'ipb-osm-poi-filters' },
  ),
);
