// Presentational components for the file manager — file/folder rows, tab pills,
// context menu, inline-rename inputs, section labels. All are props-only (no
// store access) and were extracted verbatim from FileManagerOverlay to keep the
// main overlay focused on orchestration.
import { useState, useRef, useEffect } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Layers,
  MoreHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import type { FsFileMeta, FsFolder, Rank } from '../../api/types';
import { RANK_DEFAULT, RANK_NAMES } from '../../api/types';
import type { OpenFileTab } from '../../store';
import { fmtFull, fmtRelative } from './helpers';

// ── Phase rename input (compact pill that mirrors phase tile size) ───────────

export function PhaseRenameInput({ initial, color, onCommit, onCancel }: {
  initial: string;
  color: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <input
      ref={ref}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onCommit(val)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit(val);
        if (e.key === 'Escape') onCancel();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      maxLength={20}
      className="w-24 rounded-md border bg-[#0e0e0e] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-white outline-none"
      style={{ borderColor: color }}
    />
  );
}

// ── Inline rename ─────────────────────────────────────────────────────────────

export function InlineRename({ initial, onConfirm, onCancel }: {
  initial: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <input
      ref={ref}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => (val.trim() ? onConfirm(val.trim()) : onCancel())}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && val.trim()) onConfirm(val.trim());
        if (e.key === 'Escape') onCancel();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      className="min-w-0 flex-1 rounded-sm border px-1.5 py-0.5 font-mono text-[11px] text-white outline-none"
      style={{ background: '#1a1a1a', borderColor: '#fff' }}
    />
  );
}

// ── Context menu ──────────────────────────────────────────────────────────────

export interface MenuItem { label: string; icon: React.ReactNode; danger?: boolean; onClick: () => void; }

export function CtxMenu({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-[200] mt-0.5 min-w-[170px] rounded-sm border py-0.5 shadow-[0_8px_24px_rgba(0,0,0,0.9)]"
      style={{ background: '#1a1a1a', borderColor: '#393939' }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={(e) => { e.stopPropagation(); item.onClick(); onClose(); }}
          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-[10px] uppercase tracking-[0.08em] transition hover:bg-white/[0.07] ${
            item.danger ? 'text-red-400' : 'text-white/75'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ── File row ──────────────────────────────────────────────────────────────────

export function FileRow({ file, indent, isOpen, openingId, onOpen, onRename, onDuplicate, onDelete, onExport }: {
  file: FsFileMeta;
  indent: number;
  isOpen: boolean;
  openingId: string | null;
  onOpen: (f: FsFileMeta) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onExport: (id: string, name: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const loading = openingId === file.id;
  const rank = (file.rank ?? RANK_DEFAULT) as Rank;
  const rankName = RANK_NAMES[rank];

  const menu: MenuItem[] = [
    { label: 'Rename',    icon: <Edit2 size={10} />,    onClick: () => setRenaming(true) },
    { label: 'Duplicate', icon: <Copy size={10} />,     onClick: () => onDuplicate(file.id) },
    { label: 'Export',    icon: <Download size={10} />, onClick: () => onExport(file.id, file.name) },
    { label: 'Delete',    icon: <Trash2 size={10} />,   danger: true, onClick: () => onDelete(file.id, file.name) },
  ];

  return (
    <div
      style={{ paddingLeft: `${indent * 14 + 8}px` }}
      title={`${fmtFull(file.updated_at)} · ${rankName}${file.unit ? ' · ' + file.unit : ''} · ${file.layer_count} layers · ${file.feature_count} features`}
      onClick={() => !renaming && onOpen(file)}
      className={`group relative flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-1 transition ${
        isOpen ? 'bg-white text-black' : 'text-white/80 hover:bg-white/[0.07]'
      } ${loading ? 'opacity-60' : ''}`}
    >
      {loading ? (
        <span className="ml-2 h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white/80" />
      ) : (
        <FileText size={11} className={`ml-2 shrink-0 ${isOpen ? 'text-black/60' : 'text-white/40'}`} />
      )}

      <div className="min-w-0 flex-1 overflow-hidden">
        {renaming ? (
          <InlineRename
            initial={file.name}
            onConfirm={(n) => { onRename(file.id, n); setRenaming(false); }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <div className="flex items-center gap-1.5 overflow-hidden">
            <span className={`truncate font-mono text-[11px] ${isOpen ? 'font-semibold' : ''}`}>
              {file.name}
            </span>
            {(file.unit || file.rank) && (
              <span
                className={`shrink-0 rounded-sm border px-1 py-px font-mono text-[8px] uppercase tracking-[0.04em] ${
                  isOpen ? 'border-black/30 text-black/65' : 'border-white/20 text-white/45'
                }`}
              >
                {file.unit || rankName}
              </span>
            )}
          </div>
        )}
      </div>

      {!renaming && (
        <>
          <span className={`shrink-0 font-mono text-[9px] group-hover:hidden ${isOpen ? 'text-black/45' : 'text-white/30'}`}>
            {fmtRelative(file.updated_at)}
          </span>
          <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
            {file.layer_count > 0 && (
              <span className={`flex items-center gap-0.5 font-mono text-[9px] ${isOpen ? 'text-black/45' : 'text-white/35'}`}>
                <Layers size={8} />{file.layer_count}
              </span>
            )}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                className={`rounded-sm p-0.5 ${isOpen ? 'text-black/50 hover:bg-black/10' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
              >
                <MoreHorizontal size={12} />
              </button>
              {menuOpen && <CtxMenu items={menu} onClose={() => setMenuOpen(false)} />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Folder row ────────────────────────────────────────────────────────────────

export function FolderRow({ folder, indent, expanded, onToggle, onRename, onDelete, onNewSub }: {
  folder: FsFolder;
  indent: number;
  expanded: boolean;
  onToggle: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
  onNewSub: (parentId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const menu: MenuItem[] = [
    { label: 'New subfolder', icon: <FolderPlus size={10} />, onClick: () => onNewSub(folder.id) },
    { label: 'Rename',        icon: <Edit2 size={10} />,      onClick: () => setRenaming(true) },
    { label: 'Delete folder', icon: <Trash2 size={10} />,     danger: true, onClick: () => onDelete(folder.id, folder.name) },
  ];
  return (
    <div
      style={{ paddingLeft: `${indent * 14 + 4}px` }}
      onClick={() => !renaming && onToggle()}
      className="group relative flex cursor-pointer items-center gap-1.5 rounded-sm py-1.5 pr-1 transition hover:bg-white/[0.05]"
    >
      <span className="shrink-0 text-white/40">
        {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </span>
      {expanded
        ? <FolderOpen size={11} className="shrink-0 text-amber-400/80" />
        : <Folder size={11} className="shrink-0 text-amber-400/60" />}
      <div className="min-w-0 flex-1 overflow-hidden">
        {renaming ? (
          <InlineRename
            initial={folder.name}
            onConfirm={(n) => { onRename(folder.id, n); setRenaming(false); }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <span className="block truncate font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-white/65">
            {folder.name}
          </span>
        )}
      </div>
      {!renaming && (
        <div className="relative opacity-0 transition group-hover:opacity-100">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            className="rounded-sm p-0.5 text-white/40 hover:bg-white/10 hover:text-white"
          >
            <MoreHorizontal size={12} />
          </button>
          {menuOpen && <CtxMenu items={menu} onClose={() => setMenuOpen(false)} />}
        </div>
      )}
    </div>
  );
}

// ── New folder input ──────────────────────────────────────────────────────────

export function NewFolderInput({ indent, value, onChange, onConfirm, onCancel }: {
  indent: number;
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div style={{ paddingLeft: `${indent * 14 + 4}px` }} className="flex items-center gap-1.5 py-1 pr-1">
      <Folder size={11} className="shrink-0 text-amber-400/70" />
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) onConfirm();
          if (e.key === 'Escape') onCancel();
        }}
        placeholder="Folder name…"
        className="min-w-0 flex-1 rounded-sm border px-1.5 py-0.5 font-mono text-[11px] text-white placeholder-white/30 outline-none"
        style={{ background: '#1a1a1a', borderColor: '#393939' }}
      />
      <button onClick={onConfirm} disabled={!value.trim()} className="rounded-sm p-0.5 text-emerald-400 disabled:opacity-30">
        <Check size={11} />
      </button>
      <button onClick={onCancel} className="rounded-sm p-0.5 text-white/40">
        <X size={11} />
      </button>
    </div>
  );
}

// ── Tab pill ──────────────────────────────────────────────────────────────────

interface TabPillProps {
  tab: OpenFileTab;
  isActive: boolean;
  isOverlay: boolean;
  canOverlay: boolean;
  overlayColor: string | null;
  onClick: () => void;
  onClose: () => void;
  onToggleOverlay: () => void;
}

export function TabPill({ tab, isActive, isOverlay, canOverlay, overlayColor, onClick, onClose, onToggleOverlay }: TabPillProps) {
  const rankName = RANK_NAMES[tab.rank];
  return (
    <div
      className="group relative flex shrink-0 items-stretch rounded-sm border font-mono transition"
      style={{
        borderColor: isActive ? '#fff' : isOverlay ? (overlayColor ?? '#393939') : '#393939',
        background: isActive ? '#fff' : isOverlay ? (overlayColor ?? '#1a1a1a') + '22' : '#1a1a1a',
        color: isActive ? '#131313' : 'rgba(255,255,255,0.65)',
      }}
      title={`${tab.name} · ${rankName}${tab.unit ? ' · ' + tab.unit : ''}${tab.commanderName ? ' · ' + tab.commanderName : ''}${tab.isDirty ? ' · unsaved' : ''}`}
    >
      {/* Click body to activate */}
      <button onClick={onClick} className="flex items-center gap-1.5 px-2 py-1 text-left">
        <span
          className="rounded-sm border px-1 py-px text-[8px] uppercase tracking-[0.06em]"
          style={{
            borderColor: isActive ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.2)',
            color: isActive ? '#131313' : 'rgba(255,255,255,0.55)',
          }}
        >
          {rankName.slice(0, 3)}
        </span>
        <span className="max-w-[110px] truncate text-[11px] font-semibold">
          {tab.unit || tab.name}
        </span>
        {tab.isDirty && (
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: isActive ? '#131313' : '#f59e0b' }}
            title="Unsaved changes"
          />
        )}
      </button>

      {/* Overlay toggle (only for non-active tabs the active tab commands) */}
      {!isActive && canOverlay && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleOverlay(); }}
          title={isOverlay ? 'Stop overlay' : 'Overlay on active map'}
          className="flex items-center justify-center px-1.5 transition"
          style={{
            color: isOverlay ? (overlayColor ?? '#fff') : 'rgba(255,255,255,0.4)',
            borderLeft: `1px solid ${isOverlay ? (overlayColor ?? '#393939') + '60' : '#393939'}`,
          }}
        >
          {isOverlay ? <Eye size={11} /> : <EyeOff size={11} />}
        </button>
      )}

      {/* Close X */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        title="Close tab"
        className="flex items-center justify-center px-1.5 transition hover:text-red-400"
        style={{
          color: isActive ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.3)',
          borderLeft: `1px solid ${isActive ? 'rgba(0,0,0,0.15)' : '#393939'}`,
        }}
      >
        <X size={11} />
      </button>
    </div>
  );
}

// ── Section header label ──────────────────────────────────────────────────────

export function SectionLabel({ icon, label, accent }: { icon: React.ReactNode; label: string; accent?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-1 pb-1">
      <span style={{ color: accent ?? 'rgba(255,255,255,0.35)' }}>{icon}</span>
      <span
        className="font-mono text-[9px] uppercase tracking-[0.14em]"
        style={{ color: accent ?? 'rgba(255,255,255,0.35)' }}
      >
        {label}
      </span>
    </div>
  );
}
