import { useState } from 'react';
import { useToastStore } from '../store';
import { DebugTriggerButton } from './DebugPanel';
import HistoryPanel from './HistoryPanel';
import { exportSituationReport } from '../lib/exportReport';

type TopTab = 'plan' | 'history';

export default function TopBar() {
  const [tab, setTab] = useState<TopTab>('plan');
  const push = useToastStore((s) => s.push);

  const handleExport = () => {
    const res = exportSituationReport();
    if (!res.ok) push('error', res.reason ?? 'Export failed');
    else push('success', 'Situation report opened — use your browser to save as PDF');
  };

  return (
    <nav
      className="flex h-16 w-full shrink-0 items-center justify-between px-8"
      style={{ background: '#131313', borderBottom: '1px solid #393939' }}
    >
      {/* Brand */}
      <div className="text-xl font-black tracking-tighter text-white">L1NX</div>

      {/* Tabs */}
      <div className="flex items-center gap-10 font-mono text-[11px] tracking-[0.2em]">
        <button
          onClick={() => setTab('plan')}
          className="pb-1 transition-colors"
          style={{
            color: tab === 'plan' ? '#ffffff' : 'rgba(255,255,255,0.5)',
            borderBottom: tab === 'plan' ? '2px solid #ffffff' : '2px solid transparent',
          }}
        >
          PLAN
        </button>
        <button
          onClick={() => setTab('history')}
          className="pb-1 transition-colors"
          style={{
            color: tab === 'history' ? '#ffffff' : 'rgba(255,255,255,0.5)',
            borderBottom: tab === 'history' ? '2px solid #ffffff' : '2px solid transparent',
          }}
        >
          HISTORY
        </button>
      </div>

      {/* Utilities */}
      <div className="flex items-center gap-4">
        {/* Network debug trigger — dev-only request log */}
        {import.meta.env.DEV && <DebugTriggerButton />}

        {/* Primary action */}
        <button
          onClick={handleExport}
          className="rounded-sm bg-white px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-black transition-all hover:invert"
          title="Open a print-ready operational summary (save as PDF from your browser)"
        >
          EXPORT PDF
        </button>
      </div>
      {tab === 'history' && <HistoryPanel onClose={() => setTab('plan')} />}
    </nav>
  );
}
