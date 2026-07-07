/**
 * HistoryPanel — "Past Operations" modal.
 *
 * Lists recently-updated operations (backed by /api/fs/recent) so a commander
 * can jump straight back into a prior plan. Clicking one opens it into the tab
 * system (same path as the file manager) and returns to the PLAN view.
 */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, FileText, Layers } from 'lucide-react';
import { fsGetRecent } from '../api/client';
import { RANK_DEFAULT, RANK_NAMES, type Rank } from '../api/types';
import { useOpenFile } from './file-manager/useOpenFile';

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function HistoryPanel({ onClose }: { onClose: () => void }) {
  const openFile = useOpenFile();
  const { data, isLoading, error } = useQuery({
    queryKey: ['fs', 'recent', 'history'],
    queryFn: () => fsGetRecent(20),
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleOpen = async (id: string) => {
    const ok = await openFile(id);
    if (ok) onClose();
  };

  const files = data ?? [];

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-[560px] max-w-[92vw] flex-col rounded-xl border"
        style={{ background: '#131313', borderColor: '#393939' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: '#393939' }}>
          <h2 className="font-mono text-lg font-bold tracking-[0.2em] text-white">PAST OPERATIONS</h2>
          <button
            onClick={onClose}
            className="rounded-sm border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-white/70 transition hover:border-white hover:text-white"
            style={{ borderColor: '#393939' }}
          >
            Back to plan
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {isLoading && (
            <p className="px-3 py-8 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-white/40">
              Loading recent operations…
            </p>
          )}
          {error && (
            <p className="px-3 py-8 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-amber-200/80">
              Could not load history — is the backend running?
            </p>
          )}
          {!isLoading && !error && files.length === 0 && (
            <div className="px-3 py-10 text-center">
              <p className="text-sm text-white/70">No operations saved yet.</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-white/40">
                Save a plan from the Files panel and it will appear here.
              </p>
            </div>
          )}
          <ul className="space-y-1">
            {files.map((f) => {
              const rank = (f.rank ?? RANK_DEFAULT) as Rank;
              return (
                <li key={f.id}>
                  <button
                    onClick={() => handleOpen(f.id)}
                    className="group flex w-full items-center gap-3 rounded-sm px-3 py-2 text-left transition hover:bg-white/[0.06]"
                  >
                    <FileText size={13} className="shrink-0 text-white/40 group-hover:text-white/70" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-mono text-[12px] font-semibold text-white/90">{f.name}</span>
                        <span className="shrink-0 rounded-sm border border-white/20 px-1 py-px font-mono text-[8px] uppercase tracking-[0.06em] text-white/50">
                          {f.unit || RANK_NAMES[rank]}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.04em] text-white/40">
                        <span className="flex items-center gap-1"><Clock size={9} />{fmtRelative(f.updated_at)}</span>
                        {f.layer_count > 0 && <span className="flex items-center gap-1"><Layers size={9} />{f.layer_count}</span>}
                        {f.feature_count > 0 && <span>{f.feature_count} features</span>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
