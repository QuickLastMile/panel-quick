import type { LucideIcon } from 'lucide-react';

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg = '#e9f1fb',
  iconColor = '#2a78d6',
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200/70">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase">{label}</p>
        <span
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full"
          style={{ background: iconBg, color: iconColor }}
        >
          <Icon size={16} strokeWidth={2.3} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}
