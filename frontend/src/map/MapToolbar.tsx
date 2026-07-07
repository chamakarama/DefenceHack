/**
 * MapToolbar — bottom-centre map overlay with all drawing / annotation tools.
 *
 * Tactile Noir design system:
 *   Surface: #131313 (solid, NOT semi-transparent)
 *   Borders: 1px solid #393939
 *   Active state: bright white text, white border (or inverted bg-white text-black)
 *   Font: monospace, uppercase, tracking-wide
 *   No backdrop-blur on the toolbar itself
 *
 * Four tools:
 *   1. Arrow   — click-drag to draw direction arrows
 *   2. Symbols — NATO APP-6 military symbol library, click-to-place
 *   3. Shapes  — geoman drawing palette (AOI, NAI, TAI, routes, etc.)
 *   4. Delete  — clicking any drawn object removes it immediately
 *
 * The individual tool panels live in ./toolbar/*; this file orchestrates which
 * panel is open and wires the toolbar buttons to the tactical store.
 */
import { useState } from 'react';
import ms from 'milsymbol';
import { MoveUpRight, Shield, Shapes, Eraser, X, Ruler } from 'lucide-react';
import { useTacticalStore } from '../store';
import type { ActiveMapTool } from '../store';
import ArrowPanel from './toolbar/ArrowPanel';
import SymbolPanel from './toolbar/SymbolPanel';
import ShapePanel from './toolbar/ShapePanel';
import ToolBtn from './toolbar/ToolBtn';

export default function MapToolbar() {
  const setActiveTool  = useTacticalStore((s) => s.setActiveTool);
  const isArrowMode    = useTacticalStore((s) => s.isArrowMode);
  const activeTool     = useTacticalStore((s) => s.activeTool);
  const isRulerMode    = activeTool === 'ruler';
  const isDeleteMode   = useTacticalStore((s) => s.isDeleteMode);
  const pendingSymbol  = useTacticalStore((s) => s.pendingSymbol);

  const [openPanel, setOpenPanel] = useState<ActiveMapTool>(null);

  function toggleTool(tool: ActiveMapTool) {
    if (openPanel === tool || (tool === 'arrow' && isArrowMode) || (tool === 'ruler' && isRulerMode) || (tool === 'delete' && isDeleteMode)) {
      // Click active tool → close / deactivate
      setOpenPanel(null);
      setActiveTool(null);
    } else {
      if (tool === 'symbol' || tool === 'arrow' || tool === 'shape') {
        setOpenPanel(tool);
      } else {
        setOpenPanel(null);
      }
      setActiveTool(tool);
    }
  }

  const panelWidth = openPanel === 'symbol' ? 360 : 300;

  return (
    <div
      className="pointer-events-auto absolute bottom-[112px] right-6 z-[1000] flex flex-col items-end gap-2"
    >
      {/* Delete mode banner — shown above everything */}
      {isDeleteMode && (
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-white"
          style={{ background: '#ef4444', borderColor: '#ef4444', width: panelWidth || 'auto', minWidth: 300 }}
        >
          <Eraser size={12} />
          <span>DELETE MODE — click any object to remove it. Click Delete again to stop.</span>
        </div>
      )}

      {/* Panel shown above toolbar when a tool is active */}
      {openPanel && (
        <div
          className="rounded-xl border shadow-[0_8px_32px_rgba(0,0,0,0.8)] overflow-hidden"
          style={{
            width: panelWidth,
            maxHeight: 480,
            background: '#131313',
            borderColor: '#393939',
          }}
        >
          {/* Panel header with close button */}
          <div
            className="flex items-center justify-between border-b px-3 py-2"
            style={{ borderColor: '#393939' }}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/60">
              {openPanel === 'arrow'  && 'Arrow Tool'}
              {openPanel === 'symbol' && 'Symbol Library'}
              {openPanel === 'shape'  && 'Drawing Shapes'}
            </span>
            <button
              onClick={() => { setOpenPanel(null); setActiveTool(null); }}
              className="rounded-sm p-0.5 text-white/30 transition hover:text-white/70"
            >
              <X size={12} />
            </button>
          </div>

          {openPanel === 'arrow'  && <ArrowPanel />}
          {openPanel === 'symbol' && (
            <SymbolPanel onClose={() => { setOpenPanel(null); setActiveTool(null); }} />
          )}
          {openPanel === 'shape'  && <ShapePanel />}
        </div>
      )}

      {/* Toolbar — solid Tactile Noir bar */}
      <div
        className="flex items-center gap-1 rounded-xl border p-1 shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
        style={{ background: '#131313', borderColor: '#393939' }}
      >
        {/* Divider helper: wrap buttons in a container with right border */}
        <div className="flex items-center">
          <div className="px-1">
            <ToolBtn
              icon={<MoveUpRight size={18} />}
              label="Arrow"
              active={isArrowMode}
              onClick={() => toggleTool('arrow')}
            />
          </div>

        </div>

        <div className="flex items-center">
          <div className="px-1">
            <ToolBtn
              icon={<Ruler size={18} />}
              label="Ruler"
              active={isRulerMode}
              onClick={() => toggleTool('ruler')}
            />
          </div>

        </div>

        <div className="flex items-center">
          <div className="px-1">
            <ToolBtn
              icon={
                pendingSymbol
                  ? (
                    <span
                      dangerouslySetInnerHTML={{
                        __html: new ms.Symbol(pendingSymbol.sidc, {
                          size: 18, frame: true, fill: true, infoFields: false,
                        }).asSVG(),
                      }}
                    />
                  )
                  : <Shield size={18} />
              }
              label="Symbols"
              active={openPanel === 'symbol'}
              onClick={() => toggleTool('symbol')}
            />
          </div>

        </div>

        <div className="flex items-center">
          <div className="px-1">
            <ToolBtn
              icon={<Shapes size={18} />}
              label="Shapes"
              active={openPanel === 'shape'}
              onClick={() => toggleTool('shape')}
            />
          </div>

        </div>

        <div className="px-1">
          <ToolBtn
            icon={<Eraser size={18} />}
            label="Delete"
            active={isDeleteMode}
            danger
            onClick={() => toggleTool('delete')}
          />
        </div>
      </div>
    </div>
  );
}
