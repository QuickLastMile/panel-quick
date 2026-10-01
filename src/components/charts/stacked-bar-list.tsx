import { STATUS_ORDER, STATUS_COLOR } from '@/lib/status-colors';

type Row = { proyecto: string; estado: string; count: number };

export default function StackedBarList({
  totals,
  byKey,
}: {
  totals: { key: string; count: number }[];
  byKey: Row[];
}) {
  const max = Math.max(...totals.map((t) => t.count), 1);
  const lookup: Record<string, Record<string, number>> = {};
  byKey.forEach((r) => {
    lookup[r.proyecto] = lookup[r.proyecto] || {};
    lookup[r.proyecto][r.estado] = r.count;
  });

  return (
    <div>
      <div className="space-y-2">
        {totals.map((t) => (
          <div key={t.key} className="grid grid-cols-[140px_1fr_42px] items-center gap-3">
            <span className="truncate text-xs font-medium text-slate-600" title={t.key}>
              {t.key}
            </span>
            <div className="flex h-4 overflow-hidden rounded bg-slate-100">
              {STATUS_ORDER.map((st) => {
                const c = lookup[t.key]?.[st] || 0;
                if (!c) return null;
                const pct = (c / max) * 100;
                return (
                  <div
                    key={st}
                    style={{ width: `${pct}%`, background: STATUS_COLOR[st] }}
                    title={`${t.key} · ${st}: ${c}`}
                  />
                );
              })}
            </div>
            <span className="text-right text-xs tabular-nums text-slate-500">{t.count.toLocaleString('es-CO')}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {STATUS_ORDER.map((st) => (
          <span key={st} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: STATUS_COLOR[st] }} />
            {st}
          </span>
        ))}
      </div>
    </div>
  );
}
