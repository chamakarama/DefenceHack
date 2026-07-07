// Live cursor coordinate readout + right-click-to-copy.
//
// Rendered inside <MapContainer> so it can use Leaflet map events. Holds its
// own state so only this chip re-renders on mousemove, not the whole map.
// Coordinates are how targets are communicated, so a persistent readout +
// one-gesture copy is core to a tactical map.
import { useState } from 'react';
import { useMapEvents } from 'react-leaflet';
import { useToastStore } from '../store';

function fmt(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${ns}  ${Math.abs(lon).toFixed(4)}° ${ew}`;
}

function plain(lat: number, lon: number): string {
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

export default function MapCoordinateReadout() {
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null);
  const push = useToastStore((s) => s.push);

  useMapEvents({
    mousemove(e) {
      setPos({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
    mouseout() {
      setPos(null);
    },
    contextmenu(e) {
      e.originalEvent.preventDefault();
      const text = plain(e.latlng.lat, e.latlng.lng);
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(
          () => push('success', `Copied ${text}`),
          () => push('error', 'Clipboard unavailable'),
        );
      } else {
        push('info', text);
      }
    },
  });

  if (!pos) return null;
  return (
    <div className="pointer-events-none absolute bottom-[88px] left-1/2 z-[1000] -translate-x-1/2 rounded-md border border-white/15 bg-black/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-white/85 shadow-[0_4px_16px_rgba(0,0,0,0.5)] backdrop-blur-sm">
      {fmt(pos.lat, pos.lon)} <span className="text-white/35">· right-click copies</span>
    </div>
  );
}
