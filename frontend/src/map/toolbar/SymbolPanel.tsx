import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useTacticalStore } from '../../store';
import { SYMBOL_LIBRARY, SYMBOL_CATEGORIES } from '../symbols/library';
import type { SymbolCategory, MilSymbol } from '../symbols/library';
import { SymIcon, EmptyUnitFrame } from './symbolIcons';

export default function SymbolPanel({ onClose }: { onClose: () => void }) {
  const [activeCategory, setActiveCategory] = useState<SymbolCategory>('Friendly');
  const [search, setSearch] = useState('');
  const [customNames, setCustomNames] = useState<Partial<Record<SymbolCategory, string>>>({});
  const pendingSymbol    = useTacticalStore((s) => s.pendingSymbol);
  const setPendingSymbol = useTacticalStore((s) => s.setPendingSymbol);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return SYMBOL_LIBRARY.filter(
      (sym) =>
        sym.category === activeCategory &&
        (!q || sym.name.toLowerCase().includes(q) || (sym.desc ?? '').toLowerCase().includes(q)),
    );
  }, [activeCategory, search]);

  function selectSymbol(sym: MilSymbol) {
    if (sym.isCustom) {
      const customName = customNames[sym.category] ?? '';
      setPendingSymbol({
        sidc: sym.sidc,
        name: customName ? customName : sym.name,
        category: sym.category,
        isCustom: true,
        customName: customName || undefined,
      });
    } else {
      setPendingSymbol({ sidc: sym.sidc, name: sym.name, category: sym.category });
    }
  }

  function handleCustomNameKey(
    e: React.KeyboardEvent<HTMLInputElement>,
    sym: MilSymbol,
  ) {
    if (e.key === 'Enter') {
      e.preventDefault();
      selectSymbol(sym);
    }
  }

  return (
    <div className="flex h-[420px] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: '#393939' }}>
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-white/90">
            NATO APP-6 Symbols
          </p>
          {pendingSymbol ? (
            <p className="flex items-center gap-1.5 font-mono text-[9px] text-amber-200/70">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              Placing: <strong>{pendingSymbol.name}</strong> — click map to place, pick another to change
            </p>
          ) : (
            <p className="font-mono text-[9px] text-white/35">Select a symbol then click the map to place</p>
          )}
        </div>
        {pendingSymbol && (
          <button
            onClick={() => setPendingSymbol(null)}
            className="rounded-sm border px-2 py-0.5 font-mono text-[9px] text-white/50 transition hover:border-white hover:text-white"
            style={{ borderColor: '#393939' }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div className="flex border-b" style={{ borderColor: '#393939', background: '#131313' }}>
        {SYMBOL_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex-1 py-1.5 font-mono text-[8px] uppercase tracking-[0.08em] transition"
              style={{
                color: isActive ? '#131313' : 'rgba(255,255,255,0.4)',
                background: isActive ? '#ffffff' : 'transparent',
                borderBottom: isActive ? 'none' : `1px solid transparent`,
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative border-b px-2 py-1.5" style={{ borderColor: '#393939' }}>
        <Search size={10} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="text"
          placeholder="Search symbols…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-sm border bg-[#1a1a1a] py-0.5 pl-6 pr-2 font-mono text-[10px] text-white/80 placeholder-white/25 focus:border-white/40 focus:outline-none"
          style={{ borderColor: '#393939' }}
        />
      </div>

      {/* Symbol grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-4 gap-1.5">
          {filtered.map((sym) => {
            const isActive = pendingSymbol?.sidc === sym.sidc;

            if (sym.isCustom) {
              // Custom symbol tile with text input
              const customVal = customNames[sym.category] ?? '';
              return (
                <div
                  key={`custom-${sym.category}`}
                  className="flex flex-col items-center gap-1 rounded-sm border p-1.5 text-center transition"
                  style={{
                    borderColor: isActive ? '#ffffff' : '#393939',
                    background: isActive ? 'rgba(255,255,255,0.1)' : '#1a1a1a',
                  }}
                >
                  <button
                    onClick={() => selectSymbol(sym)}
                    className="flex flex-col items-center gap-0.5 w-full"
                    title="Custom unit — type a name below"
                  >
                    <EmptyUnitFrame size={32} />
                    <span className="w-full truncate font-mono text-[8px] leading-tight text-white/50">
                      Custom
                    </span>
                  </button>
                  <input
                    type="text"
                    value={customVal}
                    placeholder="Name…"
                    maxLength={20}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      setCustomNames((prev) => ({ ...prev, [sym.category]: e.target.value }));
                    }}
                    onKeyDown={(e) => handleCustomNameKey(e, sym)}
                    className="w-full rounded-sm border bg-[#0e0e0e] px-1 py-0.5 font-mono text-[8px] text-white/70 placeholder-white/20 focus:border-white/40 focus:outline-none"
                    style={{ borderColor: '#393939' }}
                  />
                </div>
              );
            }

            return (
              <button
                key={sym.sidc}
                onClick={() => selectSymbol(sym)}
                title={sym.desc ?? sym.name}
                className="flex flex-col items-center gap-1 rounded-sm border p-1.5 text-center transition hover:border-white/30"
                style={{
                  borderColor: isActive ? '#ffffff' : '#393939',
                  background: isActive ? 'rgba(255,255,255,0.1)' : '#1a1a1a',
                }}
              >
                <SymIcon sidc={sym.sidc} size={32} />
                <span
                  className="w-full truncate font-mono text-[8px] leading-tight"
                  style={{ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.65)' }}
                >
                  {sym.name}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-4 py-4 text-center font-mono text-[10px] text-white/30">
              No symbols match your search
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
