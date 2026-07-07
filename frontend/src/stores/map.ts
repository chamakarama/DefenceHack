import { create } from 'zustand';
import type { Map as LeafletMap } from 'leaflet';

// ---------- Map handle (for programmatic flyTo) ----------
interface MapHandleState {
  map: LeafletMap | null;
  setMap: (m: LeafletMap | null) => void;
}
export const useMapStore = create<MapHandleState>((set) => ({
  map: null,
  setMap: (map) => set({ map }),
}));

// ---------- Bbox state ----------
interface BboxState {
  bbox: string | null;
  zoom: number | null;
  setBbox: (bbox: string) => void;
  setZoom: (zoom: number) => void;
}

export const useBboxStore = create<BboxState>((set) => ({
  bbox: null,
  zoom: null,
  setBbox: (bbox) => set({ bbox }),
  setZoom: (zoom) => set({ zoom }),
}));
