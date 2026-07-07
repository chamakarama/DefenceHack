// Barrel re-export for the Zustand stores.
//
// The stores were split out of this single file into `./stores/*` for
// maintainability (see frontend/src/stores/). This barrel preserves every
// existing `import { ... } from '../store'` call site — consumers need not
// change. New code may import directly from the specific store module.

export type { Bbox4 } from './stores/util';
export { bboxContains, expandBbox, parseBbox } from './stores/util';

export { useMapStore, useBboxStore } from './stores/map';
export { useBackendStatusStore, useToastStore } from './stores/ui';
export type { ToastKind, Toast } from './stores/ui';

export { useTimelineStore } from './stores/timeline';
export { useLayerStore, useLayerSlotsStore, useOsmPoiFilterStore } from './stores/layers';
export type { LayerSlot } from './stores/layers';
export { useFeatureCacheStore } from './stores/featureCache';
export { useDrawnStore } from './stores/drawn';
export { useZonesStore } from './stores/zones';
export type { Zone } from './stores/zones';

export {
  MILITARY_FEATURE_TYPES,
  useTacticalStore,
} from './stores/tactical';
export type { MilitaryFeatureType, ActiveMapTool, ArrowStyle } from './stores/tactical';

export {
  useOpenFilesStore,
  selectOverlayDrawnLayers,
  captureLiveMapState,
} from './stores/openFiles';
export type {
  OpenFileTab,
  LiveMapState,
  RankRelation,
  OpenFilesState,
  OverlayDrawnLayer,
} from './stores/openFiles';
