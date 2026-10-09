import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor = '#f3c94f',
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="panel-card rounded-xl p-4">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-bold tracking-wide text-[var(--text-muted)] uppercase">{label}</p>
        <span
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full"
          style={{ background: `${iconColor}26`, color: iconColor }}
        >
          <Icon size={16} strokeWidth={2.3} />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-[var(--text)] tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{sub}</p>}
    </div>
  );
}
