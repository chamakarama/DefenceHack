// Go-to-location search. Accepts a "lat, lon" pair (the way coordinates are
// communicated) or a place name (geocoded via OpenStreetMap Nominatim), and
// flies the map there. Rendered as a top-centre overlay in MapView.
import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useMapStore, useToastStore } from '../store';

// Matches "60.17, 24.94" / "60.17 24.94" / "60.17,24.94".
function parseLatLon(q: string): [number, number] | null {
  const m = q.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lon = parseFloat(m[2]);
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return [lat, lon];
}

export default function LocationSearch() {
  const map = useMapStore((s) => s.map);
  const push = useToastStore((s) => s.push);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  async function go() {
    const query = q.trim();
    if (!map || !query) return;

    const ll = parseLatLon(query);
    if (ll) {
      map.flyTo(ll, Math.max(map.getZoom(), 11), { duration: 0.8 });
      push('info', `Moved to ${ll[0].toFixed(4)}, ${ll[1].toFixed(4)}`);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
        { headers: { Accept: 'application/json' } },
      );
      const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
      if (!data.length) {
        push('error', `No match for "${query}"`);
        return;
      }
      const { lat, lon, display_name } = data[0];
      map.flyTo([parseFloat(lat), parseFloat(lon)], 11, { duration: 0.8 });
      push('success', `Found: ${display_name.split(',')[0]}`);
    } catch {
      push('error', 'Location search failed (offline?)');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-[1000] w-72 max-w-[70vw] -translate-x-1/2">
      <div
        className="flex items-center gap-1.5 rounded-lg border px-2 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        style={{ background: 'rgba(11,11,11,0.95)', borderColor: '#393939' }}
      >
        {busy ? (
          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <Search size={13} className="shrink-0 text-white/45" />
        )}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') go();
            if (e.key === 'Escape') setQ('');
          }}
          placeholder="Go to place or lat, lon…"
          className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-white placeholder-white/35 outline-none"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ('')}
            className="shrink-0 rounded p-0.5 text-white/40 hover:text-white"
            title="Clear"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
