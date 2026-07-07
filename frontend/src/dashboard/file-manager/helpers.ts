// Shared constants and pure helpers for the file manager. Extracted from
// FileManagerOverlay so the presentational components and the main overlay can
// share them without the overlay owning every literal.
import type { Phase } from '../../api/types';

export const PHASE_COLORS = [
  '#3b82f6', '#22c55e', '#ef4444',
  '#f59e0b', '#8b5cf6', '#06b6d4',
];

// Colour matched to OverlayLayer.tsx so the tab badge agrees with the
// dimmed shapes on the map.
export const OVERLAY_PALETTE = [
  '#22d3ee', '#a855f7', '#f59e0b', '#10b981', '#ec4899', '#60a5fa',
];

export function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function fmtFull(iso: string): string {
  return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function makeEmptyPhase(id: number): Phase {
  return {
    id,
    name: `Phase ${id}`,
    color: PHASE_COLORS[(id - 1) % PHASE_COLORS.length],
    notes: '',
    active_layers: [],
    drawn_features: { type: 'FeatureCollection', features: [] },
    layer_snapshots: {},
    conditions: {},
  };
}
