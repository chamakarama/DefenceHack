import { useState } from 'react';
import { useTacticalStore, MILITARY_FEATURE_TYPES } from '../../store';

// ── Shape panel (geoman shapes) ────────────────────────────────────────────────
//
// Two-step UX: pick shape kind (Area / Line / Point) → pick what it represents.
// Doctrinal types are filtered by shape mode so the picker stays focused on
// only the labels that make sense for the chosen geometry.

type ShapeMode = 'Polygon' | 'Polyline' | 'Marker';

const SHAPE_MODES: { mode: ShapeMode; label: string; glyph: string }[] = [
  { mode: 'Polygon',  label: 'Area',  glyph: '▢' },
  { mode: 'Polyline', label: 'Line',  glyph: '—' },
  { mode: 'Marker',   label: 'Point', glyph: '●' },
];

export default function ShapePanel() {
  const setPending      = useTacticalStore((s) => s.setPending);
  const pendingType     = useTacticalStore((s) => s.pendingType);
  const pendingDrawMode = useTacticalStore((s) => s.pendingDrawMode);

  // Default to whatever's already pending; otherwise Area (the most-common pick).
  const [mode, setMode] = useState<ShapeMode>(pendingDrawMode ?? 'Polygon');

  const typesForMode = MILITARY_FEATURE_TYPES.filter((t) => t.mode === mode);

  return (
    <div className="space-y-3 p-3">
      {/* Step 1 — pick the shape kind */}
      <div>
        <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-white/35">
          1 · shape
        </p>
        <div className="flex gap-1.5">
          {SHAPE_MODES.map(({ mode: m, label, glyph }) => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 rounded-md border py-2 font-mono text-[10px] uppercase tracking-[0.1em] transition"
                style={{
                  borderColor: active ? '#fff' : '#393939',
                  background: active ? '#fff' : '#1a1a1a',
                  color: active ? '#131313' : 'rgba(255,255,255,0.55)',
                  fontWeight: active ? 700 : 400,
                }}
              >
                <span className="mr-1.5 text-[12px]">{glyph}</span>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 — pick the doctrinal label */}
      <div>
        <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-white/35">
          2 · label · color
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {typesForMode.map((def) => {
            const isActive = pendingType === def.type;
            const label = def.type === 'annotation' ? 'Note' : def.type.replace(/_/g, ' ');
            return (
              <button
                key={def.type}
                onClick={() => setPending(def.type, def.mode)}
                title={def.desc}
                className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-left transition"
                style={{
                  borderColor: isActive ? def.color : '#393939',
                  background:  isActive ? def.color + '22' : '#1a1a1a',
                  color:       isActive ? def.color : 'rgba(255,255,255,0.7)',
                }}
              >
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: def.color }} />
                <span className="font-mono text-[10px] uppercase tracking-[0.07em]">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {pendingType && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300/40 bg-amber-500/10 px-2 py-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          <span className="font-mono text-[10px] text-amber-200">
            Drawing <strong>{pendingType}</strong> — click map to start
          </span>
        </div>
      )}
    </div>
  );
}
