import { create } from 'zustand';

// ---------- Tactical drawing state ----------
// Bridges the bottom MapToolbar with DrawControl (inside MapContainer).
// MapToolbar sets pendingType + pendingDrawMode; DrawControl consumes them.

export const MILITARY_FEATURE_TYPES = [
  { type: 'AOI',           label: 'Area of Operations',     mode: 'Polygon'   as const, color: '#ffffff', desc: 'Outer boundary of the operation' },
  { type: 'NAI',           label: 'Named Area of Interest', mode: 'Polygon'   as const, color: '#3b82f6', desc: 'Intel collection target' },
  { type: 'TAI',           label: 'Target Area of Interest',mode: 'Polygon'   as const, color: '#ef4444', desc: 'Engagement / action zone' },
  { type: 'DP',            label: 'Decision Point',         mode: 'Marker'    as const, color: '#f59e0b', desc: 'Triggers a branch in the plan' },
  { type: 'PHASE_LINE',    label: 'Phase Line',             mode: 'Polyline'  as const, color: '#22c55e', desc: 'Control line marking phase transition' },
  { type: 'BOUNDARY',      label: 'Unit Boundary',          mode: 'Polyline'  as const, color: '#f59e0b', desc: 'Lateral boundary between adjacent units' },
  { type: 'ROUTE',         label: 'Route / Axis',           mode: 'Polyline'  as const, color: '#a855f7', desc: 'Axis of advance or withdrawal route' },
  { type: 'OBJECTIVE',     label: 'Objective',              mode: 'Polygon'   as const, color: '#ef4444', desc: 'Named objective to seize/destroy' },
  { type: 'UNIT_FRIENDLY', label: 'Friendly Unit',          mode: 'Marker'    as const, color: '#3b82f6', desc: 'Friendly force position' },
  { type: 'UNIT_ENEMY',    label: 'Enemy / Threat',         mode: 'Marker'    as const, color: '#ef4444', desc: 'Known or suspected enemy position' },
  { type: 'CHOKE_POINT',   label: 'Choke Point',            mode: 'Marker'    as const, color: '#f59e0b', desc: 'Obstacle or terrain bottleneck' },
  { type: 'HIDE_SITE',     label: 'Hide Site / Assembly',   mode: 'Polygon'   as const, color: '#22c55e', desc: 'Assembly area or concealed position' },
  { type: 'annotation',    label: 'Annotation',             mode: 'Polygon'   as const, color: '#9ca3af', desc: 'Freeform note' },
] as const;

export type MilitaryFeatureType = typeof MILITARY_FEATURE_TYPES[number]['type'];

// Active map tool — only one can be active at a time
export type ActiveMapTool = 'arrow' | 'symbol' | 'shape' | 'delete' | 'ruler' | null;

// Arrow line style — replaces the legacy size picker.
export type ArrowStyle = 'solid' | 'dashed' | 'dotted';

interface TacticalState {
  activeTool: ActiveMapTool;
  setActiveTool: (tool: ActiveMapTool) => void;
  // Geoman shape mode (used when activeTool === 'shape')
  pendingType: MilitaryFeatureType | null;
  pendingDrawMode: 'Polygon' | 'Polyline' | 'Marker' | null;
  setPending: (type: MilitaryFeatureType, mode: 'Polygon' | 'Polyline' | 'Marker') => void;
  clearPending: () => void;
  // Arrow tool
  isArrowMode: boolean;
  arrowColor: string;
  arrowStyle: ArrowStyle;
  setArrowMode: (active: boolean) => void;
  setArrowColor: (color: string) => void;
  setArrowStyle: (style: ArrowStyle) => void;
  // Symbol tool
  pendingSymbol: { sidc: string; name: string; category: string; isCustom?: boolean; customName?: string } | null;
  setPendingSymbol: (sym: { sidc: string; name: string; category: string; isCustom?: boolean; customName?: string } | null) => void;
  // Delete mode
  isDeleteMode: boolean;
  setDeleteMode: (active: boolean) => void;
  // Selected phase — newly drawn features are tagged with this id, and
  // features whose phaseId differs are dimmed. null means "view all".
  selectedPhaseId: number | null;
  setSelectedPhaseId: (id: number | null) => void;
}

export const useTacticalStore = create<TacticalState>((set) => ({
  activeTool: null,
  setActiveTool: (activeTool) => set((s) => ({
    activeTool,
    isArrowMode: activeTool === 'arrow',
    isDeleteMode: activeTool === 'delete',
    pendingType: activeTool === 'shape' ? s.pendingType : null,
    pendingDrawMode: activeTool === 'shape' ? s.pendingDrawMode : null,
    pendingSymbol: activeTool === 'symbol' ? s.pendingSymbol : null,
  })),
  pendingType: null,
  pendingDrawMode: null,
  setPending: (pendingType, pendingDrawMode) => set({ pendingType, pendingDrawMode, activeTool: 'shape', isArrowMode: false, isDeleteMode: false }),
  clearPending: () => set({ pendingType: null, pendingDrawMode: null }),
  isArrowMode: false,
  arrowColor: '#ef4444',
  arrowStyle: 'solid',
  setArrowMode: (isArrowMode) => set((s) => ({
    isArrowMode,
    activeTool: isArrowMode ? 'arrow' : (s.activeTool === 'arrow' ? null : s.activeTool),
    isDeleteMode: false,
    pendingType: isArrowMode ? null : s.pendingType,
    pendingDrawMode: isArrowMode ? null : s.pendingDrawMode,
  })),
  setArrowColor: (arrowColor) => set({ arrowColor }),
  setArrowStyle: (arrowStyle) => set({ arrowStyle }),
  pendingSymbol: null,
  setPendingSymbol: (pendingSymbol) => set({ pendingSymbol }),
  isDeleteMode: false,
  setDeleteMode: (isDeleteMode) => set((s) => ({
    isDeleteMode,
    activeTool: isDeleteMode ? 'delete' : (s.activeTool === 'delete' ? null : s.activeTool),
  })),
  selectedPhaseId: 1,
  setSelectedPhaseId: (selectedPhaseId) => set({ selectedPhaseId }),
}));
