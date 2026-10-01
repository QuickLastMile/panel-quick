import { STATUS_COLOR } from '@/lib/status-colors';

export default function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLOR[status] || '#64748b';
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: `${color}1f`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {status}
    </span>
  );
}
