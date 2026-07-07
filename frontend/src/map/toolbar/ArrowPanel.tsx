import { useTacticalStore } from '../../store';
import type { ArrowStyle } from '../../store';

// ── Shared colours ─────────────────────────────────────────────────────────────
const ARROW_COLORS = [
  { hex: '#ef4444', label: 'Red'    },
  { hex: '#3b82f6', label: 'Blue'   },
  { hex: '#22c55e', label: 'Green'  },
  { hex: '#f59e0b', label: 'Amber'  },
  { hex: '#ffffff', label: 'White'  },
  { hex: '#a855f7', label: 'Purple' },
  { hex: '#f97316', label: 'Orange' },
];
const ARROW_STYLES: { value: ArrowStyle; label: string; dashArray?: string }[] = [
  { value: 'solid',  label: 'Solid'  },
  { value: 'dashed', label: 'Dashed', dashArray: '10 6' },
  { value: 'dotted', label: 'Dotted', dashArray: '2 5'  },
];

export default function ArrowPanel() {
  const arrowColor    = useTacticalStore((s) => s.arrowColor);
  const arrowStyle    = useTacticalStore((s) => s.arrowStyle);
  const setArrowColor = useTacticalStore((s) => s.setArrowColor);
  const setArrowStyle = useTacticalStore((s) => s.setArrowStyle);
  const previewDash   = ARROW_STYLES.find((s) => s.value === arrowStyle)?.dashArray;
  const previewCap    = arrowStyle === 'dotted' ? 'round' : (arrowStyle === 'dashed' ? 'butt' : 'round');

  return (
    <div className="space-y-3 p-3">
      {/* Colour row */}
      <div>
        <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-white/35">Colour</p>
        <div className="flex flex-wrap gap-2">
          {ARROW_COLORS.map(({ hex, label }) => (
            <button
              key={hex}
              title={label}
              onClick={() => setArrowColor(hex)}
              className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: hex,
                borderColor: arrowColor === hex ? '#fff' : 'rgba(255,255,255,0.15)',
                boxShadow: arrowColor === hex ? `0 0 0 2px ${hex}` : 'none',
              }}
            />
          ))}
          <label className="relative flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/5 text-[9px] text-white/50 hover:border-white/40">
            ✎
            <input type="color" value={arrowColor} onChange={(e) => setArrowColor(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
          </label>
        </div>
      </div>

      {/* Style + preview */}
      <div>
        <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-white/35">Style</p>
        <div className="flex gap-1.5">
          {ARROW_STYLES.map(({ value, label }) => {
            const active = arrowStyle === value;
            return (
              <button
                key={value}
                onClick={() => setArrowStyle(value)}
                className="flex-1 rounded-sm border py-1 font-mono text-[9px] uppercase tracking-[0.08em] transition"
                style={{
                  borderColor: active ? '#fff' : '#393939',
                  background: active ? '#fff' : '#1a1a1a',
                  color: active ? '#131313' : 'rgba(255,255,255,0.5)',
                  fontWeight: active ? 700 : 400,
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {/* Preview */}
        <svg className="mt-2 w-full" height="18" style={{ overflow: 'visible' }}>
          <defs>
            <marker id="tb-arrow-prev" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill={arrowColor} />
            </marker>
          </defs>
          <line x1="8" y1="9" x2="90%" y2="9"
            stroke={arrowColor}
            strokeWidth={3}
            strokeDasharray={previewDash}
            strokeLinecap={previewCap}
            markerEnd="url(#tb-arrow-prev)"
          />
        </svg>
      </div>

      <p className="font-mono text-[9px] text-white/30">
        Click & drag anywhere on the map • Press <kbd className="rounded bg-white/10 px-1">Esc</kbd> to stop
      </p>
    </div>
  );
}
