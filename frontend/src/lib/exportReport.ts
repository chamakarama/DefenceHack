// Situation-report export.
//
// Gathers the current operational picture from the live stores and opens a
// print-ready briefing in a new window (browser "Save as PDF"). Dependency-free
// — no jsPDF / html2canvas — so it stays robust and light. The report is a
// one-page operational summary: AO, active intelligence layers, tactical
// overlays, and timeline reference, attributed to the active doctrine.
import {
  useMapStore,
  useLayerStore,
  useDrawnStore,
  useTimelineStore,
  useOpenFilesStore,
  MILITARY_FEATURE_TYPES,
} from '../store';
import type { LayerKey } from '../api/types';
import { LAYER_LABELS } from '../dashboard/layerCatalog';

const FEATURE_LABELS: Record<string, string> = Object.fromEntries(
  MILITARY_FEATURE_TYPES.map((f) => [f.type, f.label]),
);

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtLatLon(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lon).toFixed(4)}° ${ew}`;
}

function fmtStamp(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${pad(d.getUTCDate())} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} · ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}Z`;
}

export interface ExportResult { ok: boolean; reason?: string }

export function exportSituationReport(): ExportResult {
  const map = useMapStore.getState().map;
  if (!map) return { ok: false, reason: 'Map not ready' };

  const center = map.getCenter();
  const zoom = map.getZoom();
  const b = map.getBounds();
  const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];

  const active = useLayerStore.getState().active;
  const activeLayers = (Object.keys(active) as LayerKey[]).filter((k) => active[k]);

  const drawn = useDrawnStore.getState().features;
  const drawnByType = new Map<string, number>();
  for (const f of drawn) {
    const ft = String((f.properties as Record<string, unknown>)?.feature_type ?? 'annotation');
    drawnByType.set(ft, (drawnByType.get(ft) ?? 0) + 1);
  }

  const committedMs = useTimelineStore.getState().committedMs;
  const tab = useOpenFilesStore.getState().getActiveTab();
  const phase = tab?.phases.find((p) => p.id === tab.activePhaseId);

  const layersRows = activeLayers.length
    ? activeLayers
        .map((k) => `<li>${esc(LAYER_LABELS[k] ?? k)} <span class="dim">(${esc(k)})</span></li>`)
        .join('')
    : '<li class="dim">No intelligence layers active</li>';

  const drawnRows = drawnByType.size
    ? Array.from(drawnByType.entries())
        .map(([t, n]) => `<li>${esc(FEATURE_LABELS[t] ?? t)} <span class="dim">× ${n}</span></li>`)
        .join('')
    : '<li class="dim">No tactical overlays drawn</li>';

  const opBlock = tab
    ? `
      <tr><th>Operation</th><td>${esc(tab.name)}</td></tr>
      ${tab.unit ? `<tr><th>Unit</th><td>${esc(tab.unit)}</td></tr>` : ''}
      ${tab.commanderName ? `<tr><th>Commander</th><td>${esc(tab.commanderName)}</td></tr>` : ''}
      ${phase ? `<tr><th>Phase</th><td>${esc(phase.name)}</td></tr>` : ''}`
    : `<tr><th>Operation</th><td class="dim">Unsaved working session</td></tr>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>L1NX — Operational Summary</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
         margin: 0; padding: 40px; color: #111; max-width: 820px; }
  h1 { font-size: 22px; letter-spacing: 4px; margin: 0 0 2px; text-transform: uppercase; }
  .sub { font-family: monospace; font-size: 11px; color: #666; margin-bottom: 24px; letter-spacing: 1px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #333;
       border-bottom: 1px solid #ccc; padding-bottom: 4px; margin: 22px 0 8px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th { text-align: left; width: 150px; color: #555; font-weight: 600; padding: 3px 0; vertical-align: top; }
  td { padding: 3px 0; font-family: monospace; }
  ul { margin: 6px 0; padding-left: 18px; font-size: 13px; }
  li { margin: 2px 0; }
  .dim { color: #999; }
  .toolbar { position: fixed; top: 12px; right: 12px; }
  .toolbar button { font: 600 12px monospace; padding: 8px 14px; cursor: pointer;
                    background: #111; color: #fff; border: none; border-radius: 4px; letter-spacing: 1px; }
  footer { margin-top: 28px; font-family: monospace; font-size: 10px; color: #999;
           border-top: 1px solid #ccc; padding-top: 8px; }
  @media print { .toolbar { display: none; } body { padding: 24px; } }
</style></head>
<body>
  <div class="toolbar"><button onclick="window.print()">Print / Save PDF</button></div>
  <h1>Operational Summary</h1>
  <div class="sub">L1NX · Intelligence Preparation of the Battlespace · generated ${esc(fmtStamp(Date.now()))}</div>

  <h2>Mission</h2>
  <table><tbody>
    ${opBlock}
    <tr><th>Timeline reference</th><td>${esc(fmtStamp(committedMs))}</td></tr>
  </tbody></table>

  <h2>Area of Operations</h2>
  <table><tbody>
    <tr><th>Center</th><td>${esc(fmtLatLon(center.lat, center.lng))}</td></tr>
    <tr><th>Zoom level</th><td>${esc(zoom)}</td></tr>
    <tr><th>Bounding box</th><td>${bbox.map((v) => esc(v.toFixed(4))).join(', ')}</td></tr>
  </tbody></table>

  <h2>Active Intelligence Layers (${activeLayers.length})</h2>
  <ul>${layersRows}</ul>

  <h2>Tactical Overlays (${drawn.length})</h2>
  <ul>${drawnRows}</ul>

  <footer>Ratings and overlays derived from open-source data per ATP 2-41.1 Appendix B. For planning use.</footer>
  <script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 250); });</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) return { ok: false, reason: 'Popup blocked — allow popups to export' };
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  return { ok: true };
}
