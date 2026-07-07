// ── Toolbar button ─────────────────────────────────────────────────────────────
interface ToolBtnProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  danger?: boolean;
  onClick: () => void;
}

export default function ToolBtn({ icon, label, active, danger = false, onClick }: ToolBtnProps) {
  const activeBg     = danger ? '#ef4444' : '#ffffff';
  const activeText   = danger ? '#ffffff' : '#131313';
  const activeBorder = danger ? '#ef4444' : '#ffffff';

  return (
    <button
      onClick={onClick}
      title={label}
      className="flex flex-col items-center gap-0.5 rounded-lg border px-3 py-2 transition-all"
      style={{
        borderColor: active ? activeBorder : '#393939',
        background:  active ? activeBg : '#131313',
        color:       active ? activeText : 'rgba(255,255,255,0.65)',
      }}
    >
      {icon}
      <span className="font-mono text-[8px] uppercase tracking-[0.08em]">{label}</span>
    </button>
  );
}
