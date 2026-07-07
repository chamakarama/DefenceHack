import { create } from 'zustand';
import type { FeatureCollection } from 'geojson';
import type { DrawnFeature } from '../api/types';

interface DrawnState {
  features: DrawnFeature[];
  setAll: (fs: DrawnFeature[]) => void;
  addFeature: (f: DrawnFeature) => void;
  removeFeature: (id: string | number) => void;
  updateFeature: (id: string | number, patch: Partial<DrawnFeature>) => void;
  clear: () => void;
  toCollection: () => FeatureCollection;
}

export const useDrawnStore = create<DrawnState>((set, get) => ({
  features: [],
  setAll: (features) => set({ features }),
  addFeature: (f) => set((s) => ({ features: [...s.features, f] })),
  removeFeature: (id) => set((s) => ({ features: s.features.filter((x) => x.id !== id) })),
  updateFeature: (id, patch) => set((s) => ({ features: s.features.map((f) => f.id === id ? { ...f, ...patch } : f) })),
  clear: () => set({ features: [] }),
  toCollection: () => ({ type: 'FeatureCollection', features: get().features }),
}));
