import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Bbox4 } from './util';
import { genId } from './util';

// ---------- Operation Zones (persisted) ----------
export interface Zone {
  id: string;
  name: string;
  bbox: Bbox4;
  center: [number, number]; // [lat, lon]
  zoom: number;
  createdAt: number;
  prefetchStatus?: 'idle' | 'fetching' | 'ready' | 'error';
  lastFetchedAt?: number;
}

interface ZonesState {
  zones: Zone[];
  add: (z: Omit<Zone, 'id' | 'createdAt' | 'prefetchStatus' | 'lastFetchedAt'>) => Zone;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
  update: (
    id: string,
    changes: Partial<Pick<Zone, 'name' | 'bbox' | 'center' | 'zoom'>>,
  ) => void;
  setPrefetch: (
    id: string,
    status: NonNullable<Zone['prefetchStatus']>,
    lastFetchedAt?: number,
  ) => void;
}

export const useZonesStore = create<ZonesState>()(
  persist(
    (set) => ({
      zones: [],
      add: (z) => {
        const zone: Zone = {
          ...z,
          id: genId(),
          createdAt: Date.now(),
          prefetchStatus: 'idle',
        };
        set((s) => ({ zones: [...s.zones, zone] }));
        return zone;
      },
      remove: (id) => set((s) => ({ zones: s.zones.filter((z) => z.id !== id) })),
      rename: (id, name) =>
        set((s) => ({
          zones: s.zones.map((z) => (z.id === id ? { ...z, name } : z)),
        })),
      update: (id, changes) =>
        set((s) => ({
          zones: s.zones.map((z) => (z.id === id ? { ...z, ...changes } : z)),
        })),
      setPrefetch: (id, status, lastFetchedAt) =>
        set((s) => ({
          zones: s.zones.map((z) =>
            z.id === id
              ? {
                  ...z,
                  prefetchStatus: status,
                  ...(lastFetchedAt !== undefined ? { lastFetchedAt } : {}),
                }
              : z,
          ),
        })),
    }),
    { name: 'ipb-zones' },
  ),
);
