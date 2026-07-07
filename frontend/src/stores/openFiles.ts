import { create } from 'zustand';
import type { Map as LeafletMap } from 'leaflet';
import type { FeatureCollection } from 'geojson';
import type { DrawnFeature, FsFileContent, LayerKey, Phase, Rank } from '../api/types';
import { RANK_DEFAULT } from '../api/types';
import { parseBbox } from './util';
import { useDrawnStore } from './drawn';
import { useLayerStore } from './layers';
import { useFeatureCacheStore } from './featureCache';
import { useBboxStore } from './map';
import { useTimelineStore } from './timeline';

// =============================================================================
// Open-files / tab system with command-hierarchy combine logic
// =============================================================================
//
// PROBLEM
//   An officer planning at battalion level wants to see what their company
//   commanders have planned, overlay those plans on top of their own map,
//   and optionally merge a subordinate's drawn features into one of their
//   own phases. A company commander does NOT get to peek into the
//   battalion's plan — command authority is one-way, top-down.
//
// MENTAL MODEL
//   Each open file lives in a "tab". Exactly one tab is ACTIVE at any time:
//   its map state (drawn features, layers, viewport, timeline) is loaded
//   into the live stores (useDrawnStore / useLayerStore / useFeatureCacheStore
//   / useTimelineStore) and is what the user is currently editing.
//
//   The other open tabs are dormant — their state lives only inside this
//   store. The user can pick any dormant tab as the new active tab; we
//   snapshot the outgoing tab's state into its own record before swapping
//   the incoming tab's state into the live stores.
//
// OVERLAY (the "combine" feature)
//   When the active tab outranks one or more open tabs, the user may add
//   those subordinate tabs to the OVERLAY set. Overlay tabs are dormant
//   AND read-only AND visualised on top of the active map's drawings,
//   tagged with the subordinate's unit name. Editing those features is
//   not allowed — the user must explicitly MERGE them into the active
//   tab's current phase first (which copies the drawn features over).
//
// RANK GATING
//   `canCommand(a, b)` returns true iff `a.rank > b.rank` OR `b` is a
//   descendant of `a` in the parent_file_id graph. Either condition is
//   sufficient: rank is the cheap check that doesn't need network calls,
//   the parent_file_id graph is what was explicitly set up by the user.
//
//   Subordinates may still OPEN their commander's file as a tab (and
//   switch to it), but cannot use it as an overlay or merge from it.

/**
 * One snapshot of a saved file held in the open-files store.
 *
 * The `phases` array is the source of truth for this tab while it's open.
 * When this tab is the active tab, the contents of its current phase are
 * mirrored into the live editing stores; when the user switches tabs, the
 * live stores are flushed back into this object before the next tab is
 * promoted.
 */
export interface OpenFileTab {
  id: string;                       // file ID — matches FsFileMeta.id
  name: string;
  folderId: string | null;
  rank: Rank;
  unit: string;
  commanderName: string;
  parentFileId: string | null;
  phases: Phase[];
  activePhaseId: number;
  /** True if the user has made edits since last save-to-disk. */
  isDirty: boolean;
  /** Monotonic timestamp set when the tab was opened (used for ordering). */
  openedAt: number;
}

/**
 * A snapshot of the live editing stores at a single point in time.
 *
 * Passed into the store when switching tabs / phases so the outgoing
 * context can be captured without coupling this store to the live ones.
 */
export interface LiveMapState {
  drawnFeatures: DrawnFeature[];
  activeLayers: LayerKey[];
  layerSnapshots: Record<string, FeatureCollection>;
  bbox: [number, number, number, number] | null;
  center: [number, number] | null;
  zoom: number | null;
  timelineSelectedMs: number | null;
}

export type RankRelation =
  | 'self'        // same file
  | 'commands'    // a outranks b (or b is descendant of a)
  | 'commandedBy' // b outranks a
  | 'peer'        // same rank, neither is descendant of the other
  | 'unrelated';

export interface OpenFilesState {
  /** Insertion-ordered tabs. */
  tabs: OpenFileTab[];
  /** Currently active tab — its phase data is mirrored to the live stores. */
  activeTabId: string | null;
  /**
   * Dormant tabs whose drawings should be visualised on top of the active
   * tab's map. Always a strict subset of `tabs - activeTabId`. Adding a tab
   * to this set is only permitted if the active tab outranks it.
   */
  overlayTabIds: string[];

  // ── Read-only selectors ─────────────────────────────────────────────────
  getActiveTab: () => OpenFileTab | null;
  getTab: (id: string) => OpenFileTab | null;
  getOverlayTabs: () => OpenFileTab[];

  /**
   * Decide whether `commander` (active tab) is permitted to combine, mirror,
   * or pull plans from `subordinate`.
   *
   * Both conditions taken together — rank delta AND ancestry — make this
   * resistant to mistakes where ranks haven't been set yet (ancestry still
   * grants authority) and where parent links haven't been wired up yet
   * (rank still grants authority).
   */
  canCommand: (commanderId: string, subordinateId: string) => boolean;

  /** Relationship descriptor (used by the UI to label tab badges). */
  rankRelation: (aId: string, bId: string) => RankRelation;

  // ── Tab lifecycle ───────────────────────────────────────────────────────

  /**
   * Open a file as a new tab (or focus the existing tab if already open).
   *
   * If `liveStateForCurrentActive` is provided AND a different tab is
   * already active, that tab's currently-displayed phase is updated with
   * the live state before the new tab takes focus. The caller is
   * responsible for actually loading the new tab's active phase into the
   * live stores after this returns (see `useOpenFilesStore` consumers).
   */
  openTab: (
    content: FsFileContent,
    liveStateForCurrentActive?: LiveMapState,
  ) => OpenFileTab;

  /**
   * Close a tab. If the closed tab was active, the next tab in insertion
   * order is promoted to active (and the caller must load its phase data).
   * Returns the new active tab id (or null if no tabs remain).
   */
  closeTab: (id: string, liveStateForClosedTab?: LiveMapState) => string | null;

  /**
   * Switch focus to another open tab. Captures the outgoing tab's live
   * state first. Caller is responsible for actually mirroring the incoming
   * tab's active phase into the live stores.
   */
  setActiveTab: (id: string, liveStateForCurrentActive?: LiveMapState) => OpenFileTab | null;

  /** Switch the active tab's selected phase. */
  setTabPhase: (
    tabId: string,
    phaseId: number,
    liveStateForCurrentPhase?: LiveMapState,
  ) => Phase | null;

  /**
   * Capture the current live editing state into a tab's active phase
   * without changing focus. Used by save flows.
   */
  snapshotIntoTab: (tabId: string, live: LiveMapState) => void;

  /** Replace a tab's identity/hierarchy fields (after a metadata save). */
  patchTab: (tabId: string, patch: Partial<OpenFileTab>) => void;

  /** Mark a tab dirty/clean (called by the live stores on user edits). */
  markDirty: (tabId: string) => void;
  markClean: (tabId: string) => void;

  // ── Overlay / combine ───────────────────────────────────────────────────

  /**
   * Add a dormant tab to the overlay set. Throws if the active tab does
   * not outrank `tabId` (the rank check is the same one `canCommand` uses).
   */
  addOverlay: (tabId: string) => void;
  removeOverlay: (tabId: string) => void;
  clearOverlays: () => void;
  toggleOverlay: (tabId: string) => void;

  /**
   * Merge an overlay tab's drawn features into the active tab's current
   * phase. Each copied feature gets a fresh ID and a property bag tagging
   * it with the source tab's name/unit/rank so it remains visually
   * traceable after the merge.
   *
   * Returns the merged DrawnFeature[] for the caller to push into
   * `useDrawnStore.setAll` (this store does not touch live state directly).
   */
  mergeOverlayIntoActivePhase: (overlayTabId: string) => DrawnFeature[] | null;

  // ── Bulk reset (e.g. on logout / panic clear) ───────────────────────────
  closeAll: () => void;
}

/**
 * Heuristic: should `a` be allowed to command (overlay / merge / inspect)
 * `b`? Returns true when rank or ancestry grants authority.
 */
function authorityGrants(
  tabs: OpenFileTab[],
  commander: OpenFileTab,
  subordinate: OpenFileTab,
): boolean {
  if (commander.id === subordinate.id) return false;
  if (commander.rank > subordinate.rank) return true;

  // Ancestry check: walk subordinate.parentFileId up the chain. If we hit
  // commander.id, authority is granted regardless of rank.
  const byId = new Map(tabs.map((t) => [t.id, t]));
  let cursor: string | null = subordinate.parentFileId;
  const seen = new Set<string>([subordinate.id]);
  let depth = 0;
  while (cursor && depth < 32) {
    if (cursor === commander.id) return true;
    if (seen.has(cursor)) break;
    seen.add(cursor);
    const next = byId.get(cursor);
    if (!next) break;
    cursor = next.parentFileId;
    depth += 1;
  }
  return false;
}

/** Compute a Phase from a snapshot of the live editing stores. */
function buildPhaseFromLive(base: Phase, live: LiveMapState): Phase {
  return {
    ...base,
    bbox:                 live.bbox,
    center:               live.center,
    zoom:                 live.zoom,
    timeline_selected_ms: live.timelineSelectedMs,
    active_layers:        live.activeLayers,
    drawn_features:       { type: 'FeatureCollection', features: live.drawnFeatures },
    layer_snapshots:      live.layerSnapshots,
  };
}

/** Convert a FsFileContent into the internal tab representation. */
function tabFromContent(content: FsFileContent): OpenFileTab {
  // Reconstruct phases — legacy single-state files get wrapped as Phase 1.
  let phases: Phase[] = content.phases ?? [];
  if (phases.length === 0) {
    phases = [{
      id: 1,
      name: 'Phase 1',
      color: '#3b82f6',
      notes: content.notes ?? '',
      bbox: content.bbox ?? null,
      center: content.center ?? null,
      zoom: content.zoom ?? null,
      timeline_selected_ms: content.timeline_selected_ms ?? null,
      active_layers: content.active_layers ?? [],
      drawn_features: content.drawn_features ?? { type: 'FeatureCollection', features: [] },
      layer_snapshots: content.layer_snapshots ?? {},
      conditions: content.conditions ?? {},
    }];
  }
  const activePhaseId = content.current_phase ?? phases[0]?.id ?? 1;
  return {
    id: content.id,
    name: content.name,
    folderId: content.folder_id,
    rank: (content.rank ?? RANK_DEFAULT) as Rank,
    unit: content.unit ?? '',
    commanderName: content.commander_name ?? '',
    parentFileId: content.parent_file_id ?? null,
    phases,
    activePhaseId,
    isDirty: false,
    openedAt: Date.now(),
  };
}

/** Snapshot live state into a tab's active phase (immutable update). */
function captureLiveIntoTab(tab: OpenFileTab, live: LiveMapState): OpenFileTab {
  const phases = tab.phases.map((p) =>
    p.id === tab.activePhaseId ? buildPhaseFromLive(p, live) : p,
  );
  return { ...tab, phases, isDirty: true };
}

export const useOpenFilesStore = create<OpenFilesState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  overlayTabIds: [],

  // ── Selectors ──────────────────────────────────────────────────────────
  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    if (!activeTabId) return null;
    return tabs.find((t) => t.id === activeTabId) ?? null;
  },
  getTab: (id) => get().tabs.find((t) => t.id === id) ?? null,
  getOverlayTabs: () => {
    const { tabs, overlayTabIds } = get();
    const idSet = new Set(overlayTabIds);
    return tabs.filter((t) => idSet.has(t.id));
  },

  canCommand: (commanderId, subordinateId) => {
    if (commanderId === subordinateId) return false;
    const { tabs } = get();
    const commander = tabs.find((t) => t.id === commanderId);
    const subordinate = tabs.find((t) => t.id === subordinateId);
    if (!commander || !subordinate) return false;
    return authorityGrants(tabs, commander, subordinate);
  },

  rankRelation: (aId, bId) => {
    if (aId === bId) return 'self';
    const { tabs } = get();
    const a = tabs.find((t) => t.id === aId);
    const b = tabs.find((t) => t.id === bId);
    if (!a || !b) return 'unrelated';
    if (authorityGrants(tabs, a, b)) return 'commands';
    if (authorityGrants(tabs, b, a)) return 'commandedBy';
    if (a.rank === b.rank) return 'peer';
    return 'unrelated';
  },

  // ── Tab lifecycle ──────────────────────────────────────────────────────
  openTab: (content, liveStateForCurrentActive) => {
    const { tabs, activeTabId } = get();

    // Already open? Just focus it.
    const existing = tabs.find((t) => t.id === content.id);
    if (existing) {
      // Capture outgoing tab state first
      const updatedTabs =
        activeTabId && activeTabId !== existing.id && liveStateForCurrentActive
          ? tabs.map((t) =>
              t.id === activeTabId ? captureLiveIntoTab(t, liveStateForCurrentActive) : t,
            )
          : tabs;
      set({
        tabs: updatedTabs,
        activeTabId: existing.id,
        // Drop overlays — they no longer make sense under a new commander
        overlayTabIds: get().overlayTabIds.filter((id) => id !== existing.id),
      });
      return existing;
    }

    const newTab = tabFromContent(content);

    // Capture outgoing tab into the array, then append the new one
    const baseTabs =
      activeTabId && liveStateForCurrentActive
        ? tabs.map((t) =>
            t.id === activeTabId ? captureLiveIntoTab(t, liveStateForCurrentActive) : t,
          )
        : tabs;

    set({
      tabs: [...baseTabs, newTab],
      activeTabId: newTab.id,
      // New active tab → reset overlays (rank constraints may differ)
      overlayTabIds: [],
    });
    return newTab;
  },

  closeTab: (id, liveStateForClosedTab) => {
    const { tabs, activeTabId } = get();
    const idx = tabs.findIndex((t) => t.id === id);
    if (idx === -1) return activeTabId;

    let updated = [...tabs];

    // If we're closing the active tab and have live state, capture it first
    // (no-op for save purposes — the tab is being discarded — but lets callers
    //  reuse this path before persisting).
    if (id === activeTabId && liveStateForClosedTab) {
      updated[idx] = captureLiveIntoTab(updated[idx], liveStateForClosedTab);
    }

    updated.splice(idx, 1);

    let nextActiveId: string | null = activeTabId;
    if (id === activeTabId) {
      // Prefer the tab that was to the LEFT of the closed one;
      // fall back to the first tab; null if none remain.
      nextActiveId = updated[Math.max(0, idx - 1)]?.id ?? updated[0]?.id ?? null;
    }

    set({
      tabs: updated,
      activeTabId: nextActiveId,
      overlayTabIds: get().overlayTabIds.filter((oid) =>
        updated.some((t) => t.id === oid) && oid !== nextActiveId,
      ),
    });
    return nextActiveId;
  },

  setActiveTab: (id, liveStateForCurrentActive) => {
    const { tabs, activeTabId } = get();
    if (id === activeTabId) return get().getActiveTab();
    const incoming = tabs.find((t) => t.id === id);
    if (!incoming) return null;

    const updatedTabs =
      activeTabId && liveStateForCurrentActive
        ? tabs.map((t) =>
            t.id === activeTabId ? captureLiveIntoTab(t, liveStateForCurrentActive) : t,
          )
        : tabs;

    set({
      tabs: updatedTabs,
      activeTabId: id,
      // Clear overlays — the new active tab may not outrank them
      overlayTabIds: [],
    });
    return incoming;
  },

  setTabPhase: (tabId, phaseId, liveStateForCurrentPhase) => {
    const { tabs } = get();
    const tabIdx = tabs.findIndex((t) => t.id === tabId);
    if (tabIdx === -1) return null;
    const tab = tabs[tabIdx];

    // Capture outgoing phase state if requested
    const phases = liveStateForCurrentPhase
      ? tab.phases.map((p) =>
          p.id === tab.activePhaseId ? buildPhaseFromLive(p, liveStateForCurrentPhase) : p,
        )
      : tab.phases;

    const newPhase = phases.find((p) => p.id === phaseId);
    if (!newPhase) return null;

    const updated: OpenFileTab = {
      ...tab,
      phases,
      activePhaseId: phaseId,
      isDirty: liveStateForCurrentPhase ? true : tab.isDirty,
    };
    const nextTabs = [...tabs];
    nextTabs[tabIdx] = updated;
    set({ tabs: nextTabs });
    return newPhase;
  },

  snapshotIntoTab: (tabId, live) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId ? captureLiveIntoTab(t, live) : t)),
    }));
  },

  patchTab: (tabId, patch) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, ...patch } : t)),
    }));
  },

  markDirty: (tabId) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, isDirty: true } : t)),
    }));
  },
  markClean: (tabId) => {
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === tabId ? { ...t, isDirty: false } : t)),
    }));
  },

  // ── Overlay ─────────────────────────────────────────────────────────────
  addOverlay: (tabId) => {
    const { activeTabId, overlayTabIds, tabs } = get();
    if (!activeTabId || tabId === activeTabId) return;
    if (overlayTabIds.includes(tabId)) return;
    const commander = tabs.find((t) => t.id === activeTabId);
    const subordinate = tabs.find((t) => t.id === tabId);
    if (!commander || !subordinate) return;
    if (!authorityGrants(tabs, commander, subordinate)) {
      // Silent no-op rather than throw — the UI should disable the action.
      return;
    }
    set({ overlayTabIds: [...overlayTabIds, tabId] });
  },

  removeOverlay: (tabId) => {
    set((s) => ({ overlayTabIds: s.overlayTabIds.filter((id) => id !== tabId) }));
  },

  clearOverlays: () => set({ overlayTabIds: [] }),

  toggleOverlay: (tabId) => {
    const { overlayTabIds } = get();
    if (overlayTabIds.includes(tabId)) get().removeOverlay(tabId);
    else get().addOverlay(tabId);
  },

  mergeOverlayIntoActivePhase: (overlayTabId) => {
    const { tabs, activeTabId } = get();
    if (!activeTabId) return null;
    const commander = tabs.find((t) => t.id === activeTabId);
    const subordinate = tabs.find((t) => t.id === overlayTabId);
    if (!commander || !subordinate) return null;
    if (!authorityGrants(tabs, commander, subordinate)) return null;

    // Pull subordinate's current phase drawn features
    const subPhase = subordinate.phases.find((p) => p.id === subordinate.activePhaseId);
    const subFeatures = (subPhase?.drawn_features?.features ?? []) as DrawnFeature[];
    if (subFeatures.length === 0) return [];

    // Tag each merged feature with provenance so the UI can colour them
    // differently and so a future un-merge could surgically pull them back.
    const tagged: DrawnFeature[] = subFeatures.map((f) => ({
      ...f,
      id: `${f.id ?? 'feat'}__from-${subordinate.id.slice(0, 8)}-${Math.random().toString(36).slice(2, 6)}`,
      properties: {
        ...(f.properties ?? {}),
        _source_tab_id:    subordinate.id,
        _source_unit:      subordinate.unit || subordinate.name,
        _source_rank:      subordinate.rank,
        _source_commander: subordinate.commanderName || null,
        _merged_at:        new Date().toISOString(),
      },
    }));

    // Append into the commander's active phase + flag dirty
    const commanderPhase = commander.phases.find((p) => p.id === commander.activePhaseId);
    const existing = (commanderPhase?.drawn_features?.features ?? []) as DrawnFeature[];
    const merged = [...existing, ...tagged];

    set({
      tabs: tabs.map((t) => {
        if (t.id !== commander.id) return t;
        return {
          ...t,
          isDirty: true,
          phases: t.phases.map((p) =>
            p.id === t.activePhaseId
              ? {
                  ...p,
                  drawn_features: { type: 'FeatureCollection', features: merged },
                }
              : p,
          ),
        };
      }),
    });
    return merged;
  },

  // ── Bulk reset ──────────────────────────────────────────────────────────
  closeAll: () => set({ tabs: [], activeTabId: null, overlayTabIds: [] }),
}));

/**
 * Lightweight selector: returns the drawn features that should be drawn as
 * read-only overlays on the active map. Each entry includes provenance
 * metadata so the UI can render them in their unit's accent colour.
 *
 * Use this from a map layer component to render dimmed overlays alongside
 * the live `useDrawnStore` features.
 */
export interface OverlayDrawnLayer {
  tabId: string;
  tabName: string;
  unit: string;
  rank: Rank;
  commanderName: string;
  features: DrawnFeature[];
}

export function selectOverlayDrawnLayers(state: OpenFilesState): OverlayDrawnLayer[] {
  const out: OverlayDrawnLayer[] = [];
  for (const id of state.overlayTabIds) {
    const tab = state.tabs.find((t) => t.id === id);
    if (!tab) continue;
    const phase = tab.phases.find((p) => p.id === tab.activePhaseId);
    const features = (phase?.drawn_features?.features ?? []) as DrawnFeature[];
    out.push({
      tabId: tab.id,
      tabName: tab.name,
      unit: tab.unit,
      rank: tab.rank,
      commanderName: tab.commanderName,
      features,
    });
  }
  return out;
}

/**
 * Build a fresh LiveMapState snapshot from the existing live stores.
 *
 * Centralised here so every tab-switch / save call site captures the same
 * fields without duplicating glue code. Pass the result into openTab /
 * setActiveTab / setTabPhase as the `liveStateForCurrentActive` argument.
 */
export function captureLiveMapState(map: LeafletMap | null): LiveMapState {
  const drawnFeatures = useDrawnStore.getState().features;
  const activeMap     = useLayerStore.getState().active;
  const allLayerKeys  = Object.keys(activeMap) as LayerKey[];
  const activeLayers  = allLayerKeys.filter((k) => activeMap[k]);

  const featureCache  = useFeatureCacheStore.getState().features;
  const layerSnapshots: Record<string, FeatureCollection> = {};
  for (const [k, feats] of Object.entries(featureCache)) {
    if (feats && feats.length > 0) {
      layerSnapshots[k] = { type: 'FeatureCollection', features: feats };
    }
  }

  const bboxStr  = useBboxStore.getState().bbox;
  const bbox     = bboxStr ? parseBbox(bboxStr) : null;

  let center: [number, number] | null = null;
  let zoom: number | null = null;
  if (map) {
    const c = map.getCenter();
    center = [c.lat, c.lng];
    zoom = map.getZoom();
  }

  return {
    drawnFeatures,
    activeLayers,
    layerSnapshots,
    bbox,
    center,
    zoom,
    timelineSelectedMs: useTimelineStore.getState().selectedMs,
  };
}
