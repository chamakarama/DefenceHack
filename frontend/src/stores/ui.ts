import { create } from 'zustand';
import { genId } from './util';

// ---------- Backend connectivity status ----------
interface BackendStatusState {
  unavailable: boolean;
  reason?: string;
  setUnavailable: (reason?: string) => void;
  setAvailable: () => void;
}

export const useBackendStatusStore = create<BackendStatusState>((set) => ({
  unavailable: false,
  reason: undefined,
  setUnavailable: (reason) => set({ unavailable: true, reason }),
  setAvailable: () => set({ unavailable: false, reason: undefined }),
}));

// ---------- Toasts (visual indicators) ----------
export type ToastKind = 'info' | 'success' | 'error';
export interface Toast {
  id: string;
  kind: ToastKind;
  text: string;
}

interface ToastsState {
  toasts: Toast[];
  push: (kind: ToastKind, text: string) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastsState>((set, get) => ({
  toasts: [],
  push: (kind, text) => {
    const id = genId();
    set((s) => ({ toasts: [...s.toasts, { id, kind, text }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: get().toasts.filter((t) => t.id !== id) })),
}));
