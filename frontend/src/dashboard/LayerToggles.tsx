import { RefreshCw, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useBboxStore, useFeatureCacheStore, useLayerStore, useToastStore } from '../store';
import type { LayerKey, LayerStatus } from '../api/types';
import { useOsmPoiFilterStore } from '../store';
import { OSM_POI_CATEGORIES } from '../map/osmPoi';
import { MIN_ZOOM_BY_LAYER, isLayerSuppressedByZoom } from '../map/layerLoadLimits';
import LayerSlots from '../map/LayerSlots';
import SourceStatusList from './SourceStatusList';
import { LAYERS } from './layerCatalog';

const dotForStatus = (s?: LayerStatus) => {
  if (!s || s === 'unknown') return 'bg-white/35';
  if (s === 'ok') return 'bg-emerald-300';
  if (s === 'unavailable' || s === 'partial' || s === 'degraded') return 'bg-amber-300';
  return 'bg-red-300';
};

// Human-readable status used in the dot tooltip so hovering explains the colour.
const statusTooltip = (s?: LayerStatus): string => {
  switch (s) {
    case 'ok':          return 'Loaded — data available for this area';
    case 'partial':     return 'Partial — some data returned (try zooming in)';
    case 'degraded':    return 'Degraded — upstream responded slowly or incompletely';
    case 'unavailable': return 'Unavailable — source has no data or no API key';
    case 'error':       return 'Error — upstream request failed';
    default:            return 'Not loaded yet — toggle on or pan the map';
  }
};

export default function LayerToggles() {
  const active = useLayerStore((s) => s.active);
  const status = useLayerStore((s) => s.status);
  const loading = useLayerStore((s) => s.loading);
  const toggle = useLayerStore((s) => s.toggle);
  const zoom = useBboxStore((s) => s.zoom);
  const osmEnabled = useOsmPoiFilterStore((s) => s.enabled);
  const toggleOsm = useOsmPoiFilterStore((s) => s.toggle);
  const setAllOsm = useOsmPoiFilterStore((s) => s.setAll);
  const clearAllOsm = useOsmPoiFilterStore((s) => s.clearAll);
  const clearLayerFeatures = useFeatureCacheStore((s) => s.clear);
  const clearAllFeatures = useFeatureCacheStore((s) => s.clearAll);
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);

  const handleReload = () => {
    // The feature cache tracks covered bboxes; invalidateQueries alone does nothing
    // because SourceLayer keeps `enabled: false` while a bbox is still covered.
    // Clear active layers' coverage so they re-fetch the current viewport.
    Object.entries(active)
      .filter(([, on]) => on)
      .forEach(([id]) => clearLayerFeatures(id as LayerKey));
    queryClient.invalidateQueries({ queryKey: ['layer'] });
    pushToast('info', 'Reloading active layers…');
  };

  const handleClearCache = () => {
    clearAllFeatures();
    queryClient.invalidateQueries({ queryKey: ['layer'] });
    pushToast('info', 'Map data cache cleared');
  };

  return (
    <div>
      <div className="mb-3">
        <LayerSlots />
      </div>
      <div className="mb-2 flex items-center justify-center gap-1.5">
        <button
          type="button"
          onClick={handleReload}
          className="flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/75 transition hover:border-white hover:bg-white hover:text-black"
          style={{ borderColor: '#393939', background: '#1a1a1a' }}
          title="Re-request every active layer for the current view (keeps cached data elsewhere)"
        >
          <RefreshCw className="h-3 w-3" />
          Refetch
        </button>
        <button
          type="button"
          onClick={handleClearCache}
          className="flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/75 transition hover:border-white hover:bg-white hover:text-black"
          style={{ borderColor: '#393939', background: '#1a1a1a' }}
          title="Discard all cached map features everywhere; layers refetch on next pan"
        >
          <Trash2 className="h-3 w-3" />
          Reset data
        </button>
      </div>
      <ul className="space-y-1">
        {LAYERS.map((l) => {
          const isOsm = l.id === 'osm';
          const minZoom = MIN_ZOOM_BY_LAYER[l.id];
          const suppressed = !!active[l.id] && isLayerSuppressedByZoom(l.id, zoom);
          return (
            <li key={l.id} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 hover:bg-white/[0.04]">
              <div className="flex items-center justify-between">
                <label className={`flex flex-1 cursor-pointer items-center gap-2 ${suppressed ? 'opacity-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={!!active[l.id]}
                    onChange={() => toggle(l.id)}
                  />
                  <span className="flex flex-col leading-tight">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/90">{l.label}</span>
                    {l.hint && <span className="font-mono text-[10px] uppercase tracking-[0.04em] text-white/45">{l.hint}</span>}
                  </span>
                </label>
                {suppressed ? (
                  <span
                    className="rounded-lg border border-amber-300/50 bg-amber-300/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-amber-200"
                    title={`On, but not rendering — zoom in to ≥ ${minZoom} to load this layer (current ${zoom ?? '?'})`}
                  >
                    zoom ≥ {minZoom}
                  </span>
                ) : active[l.id] && loading[l.id] ? (
                  <span
                    className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white"
                    title="loading…"
                  />
                ) : (
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotForStatus(status[l.id])}`}
                    title={statusTooltip(status[l.id])}
                  />
                )}
              </div>

              {isOsm && active.osm && (
                <div className="mt-2 rounded-lg border border-white/15 bg-black/45 p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/65">
                      POI filters
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={setAllOsm}
                        className="rounded-lg border border-white/20 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.06em] text-white/80 hover:bg-white/[0.12]"
                      >
                        all
                      </button>
                      <button
                        type="button"
                        onClick={clearAllOsm}
                        className="rounded-lg border border-white/20 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.06em] text-white/80 hover:bg-white/[0.12]"
                      >
                        none
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    {OSM_POI_CATEGORIES.map((c) => (
                      <label key={c.id} className="flex items-center gap-1 text-[11px] text-white/85">
                        <input
                          type="checkbox"
                          checked={osmEnabled.includes(c.id)}
                          onChange={() => toggleOsm(c.id)}
                        />
                        <span dangerouslySetInnerHTML={{ __html: c.icon }} style={{ color: c.color, display: 'inline-flex', alignItems: 'center' }} />
                        <span className="truncate">{c.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 border-t border-white/10 pt-3">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/85">Source Status</h3>
        <SourceStatusList />
      </div>
    </div>
  );
}
