import { useMemo } from 'react';
import ms from 'milsymbol';

// ── Milsymbol mini-icon (inline SVG, rendered by milsymbol) ───────────────────
export function SymIcon({ sidc, size = 36 }: { sidc: string; size?: number }) {
  const svg = useMemo(() => {
    try {
      return new ms.Symbol(sidc, { size, frame: true, fill: true, infoFields: false }).asSVG();
    } catch {
      return '';
    }
  }, [sidc, size]);
  return (
    <span
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    />
  );
}

// ── Empty unit frame SVG for custom symbol tile ───────────────────────────────
export function EmptyUnitFrame({ size = 32 }: { size?: number }) {
  // Neutral rectangle frame representing an unknown/custom unit
  const w = size;
  const h = Math.round(size * 0.65);
  const strokeW = Math.max(1.5, size / 20);
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'block' }}
    >
      <rect
        x={strokeW / 2}
        y={strokeW / 2}
        width={w - strokeW}
        height={h - strokeW}
        rx={2}
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={strokeW}
        strokeDasharray="4 3"
      />
      <text
        x={w / 2}
        y={h / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="rgba(255,255,255,0.4)"
        fontSize={Math.round(size * 0.28)}
        fontFamily="monospace"
      >
        ?
      </text>
    </svg>
  );
}
