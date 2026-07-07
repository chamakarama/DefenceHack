// Single source of truth for the user-facing layer catalog (id, label, hint).
// Shared by the layer toggle list and the situation-report export so labels
// never drift between the UI and the briefing output.
import type { LayerKey } from '../api/types';

export interface LayerEntry {
  id: LayerKey;
  label: string;
  hint?: string;
}

export const LAYERS: LayerEntry[] = [
  { id: 'osm',          label: 'Points of interest', hint: 'hospitals, fuel, power' },
  { id: 'digiroad',     label: 'Roads & bridges',    hint: 'passability, width, load limits' },
  { id: 'mml',          label: 'Terrain types',      hint: 'forest, swamp, fields, water — go/no-go context' },
  { id: 'mml_contours', label: 'Elevation',          hint: 'contour lines — hills, ridges, dead ground' },
  { id: 'statfin',      label: 'Population',         hint: 'civilian density by area — billeting & support' },
  { id: 'fmi',          label: 'Live weather',       hint: 'current wind, temp & visibility at met stations' },
  { id: 'fmi_forecast', label: 'Weather forecast',   hint: '48-hour wind, rain & drone-fly conditions' },
  { id: 'syke',         label: 'Flood & nature',     hint: 'flood risk zones, protected areas (Natura 2000)' },
  { id: 'opencellid',   label: 'Cell towers',        hint: 'coverage radii — signals intelligence & comms' },
  { id: 'starlink',     label: 'Starlink passes',    hint: 'live satellite positions & coverage footprints' },
  { id: 'astronomy',    label: 'Light conditions',   hint: 'sunrise, sunset, moon phase — night ops window' },
  { id: 'exposure',     label: 'Cover & exposure',   hint: 'L1 = hard cover → L5 = fully exposed open ground' },
  { id: 'mcoo',         label: 'Vehicle mobility',   hint: 'go / slow-go / no-go for wheeled & tracked vehicles' },
];

export const LAYER_LABELS: Partial<Record<LayerKey, string>> = Object.fromEntries(
  LAYERS.map((l) => [l.id, l.label]),
);
