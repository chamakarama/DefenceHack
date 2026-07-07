// Shared "open a saved file into the tab system" action.
//
// Extracted from FileManagerOverlay so other entry points (e.g. the History
// view) open files through the exact same path — capture live state, push the
// file's content into the live stores, fly the map, select the initial phase.
import { useCallback } from 'react';
import type { Feature } from 'geojson';
import { fsOpenFile } from '../../api/client';
import type { DrawnFeature, FsFileContent, LayerKey } from '../../api/types';
import {
  useDrawnStore,
  useFeatureCacheStore,
  useLayerStore,
  useMapStore,
  useOpenFilesStore,
  useTacticalStore,
  useTimelineStore,
  useToastStore,
  captureLiveMapState,
} from '../../store';

export function useOpenFile() {
  const push = useToastStore((s) => s.push);

  return useCallback(
    async (fileId: string): Promise<FsFileContent | null> => {
      try {
        const content = await fsOpenFile(fileId);
        const map = useMapStore.getState().map;
        const activeTabId = useOpenFilesStore.getState().activeTabId;
        const live = activeTabId ? captureLiveMapState(map) : undefined;
        const tab = useOpenFilesStore.getState().openTab(content, live);

        // Wipe the live stores then push the file's global content.
        useFeatureCacheStore.getState().clearAll();
        if (content.layer_snapshots && Object.keys(content.layer_snapshots).length > 0) {
          useFeatureCacheStore.getState().injectSnapshots(
            content.layer_snapshots as Record<string, { features: Feature[] }>,
            content.bbox ?? undefined,
          );
        }
        useLayerStore.getState().setActiveLayers((content.active_layers ?? []) as LayerKey[]);
        useDrawnStore.getState().setAll((content.drawn_features?.features ?? []) as DrawnFeature[]);
        if (content.timeline_selected_ms != null) {
          useTimelineStore.getState().setSelectedMs(content.timeline_selected_ms);
        }
        if (map) {
          if (content.bbox) {
            const [w, s, e, n] = content.bbox;
            map.fitBounds([[s, w], [n, e]], { animate: true, duration: 0.6 });
          } else if (content.center && content.zoom != null) {
            map.flyTo([content.center[0], content.center[1]], content.zoom, { animate: true, duration: 0.6 });
          }
        }
        const firstPhaseId = tab.phases[0]?.id ?? 1;
        const initialSelected = tab.phases.some((p) => p.id === tab.activePhaseId)
          ? tab.activePhaseId
          : firstPhaseId;
        useTacticalStore.getState().setSelectedPhaseId(initialSelected);
        push('success', `Opened: ${content.name}`);
        return content;
      } catch (e) {
        push('error', `Failed to open: ${String(e)}`);
        return null;
      }
    },
    [push],
  );
}
