// Shared test factories for store-logic suites.
import type { Feature } from 'geojson';
import type { FsFileContent, Phase, Rank } from '../api/types';
import type { LiveMapState } from '../store';

let phaseSeq = 0;

export function makePhase(over: Partial<Phase> = {}): Phase {
  phaseSeq += 1;
  return {
    id: over.id ?? 1,
    name: over.name ?? `Phase ${over.id ?? 1}`,
    color: '#3b82f6',
    notes: '',
    bbox: null,
    center: null,
    zoom: null,
    timeline_selected_ms: null,
    active_layers: [],
    drawn_features: { type: 'FeatureCollection', features: [] },
    layer_snapshots: {},
    conditions: {},
    ...over,
  };
}

export function makeContent(
  over: Partial<FsFileContent> & { id: string },
): FsFileContent {
  return {
    type: 'file',
    name: `File ${over.id}`,
    folder_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    active_layers: [],
    layer_count: 0,
    feature_count: 0,
    rank: 3 as Rank,
    unit: '',
    commander_name: '',
    parent_file_id: null,
    notes: '',
    center: null,
    zoom: null,
    drawn_features: { type: 'FeatureCollection', features: [] },
    layer_snapshots: {},
    conditions: {},
    phases: [makePhase({ id: 1 })],
    current_phase: 1,
    ...over,
  };
}

export function makeLive(over: Partial<LiveMapState> = {}): LiveMapState {
  return {
    drawnFeatures: [],
    activeLayers: [],
    layerSnapshots: {},
    bbox: null,
    center: null,
    zoom: null,
    timelineSelectedMs: null,
    ...over,
  };
}

let featSeq = 0;

/** A minimal point Feature with optional id/properties for cache-dedup tests. */
export function makeFeature(over: Partial<Feature> = {}): Feature {
  featSeq += 1;
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [featSeq, featSeq] },
    properties: {},
    ...over,
  };
}
