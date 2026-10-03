'use client';

import { useMemo, useState } from 'react';
import { STATUS_ORDER, STATUS_COLOR } from '@/lib/status-colors';
import { useChartTooltip, ChartTooltip } from './chart-tooltip';

type Row = { proyecto: string; estado: string; count: number };

export default function StackedBarList({
  totals,
  byKey,
  limit = 14,
  selectable = false,
  selectPlaceholder = 'Todos',
}: {
  totals: { key: string; count: number }[];
  byKey: Row[];
  limit?: number;
  selectable?: boolean;
  selectPlaceholder?: string;
}) {
  const [selected, setSelected] = useState('');
  const { tooltip, show, hide } = useChartTooltip();

  const lookup: Record<string, Record<string, number>> = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    byKey.forEach((r) => {
      m[r.proyecto] = m[r.proyecto] || {};
      m[r.proyecto][r.estado] = r.count;
    });
    return m;
  }, [byKey]);

  const visible = selected ? totals.filter((t) => t.key === selected) : totals.slice(0, limit);
  const max = Math.max(...visible.map((t) => t.count), 1);

  const selectedBreakdown = selected
    ? STATUS_ORDER.map((st) => ({ st, count: lookup[selected]?.[st] || 0 })).filter((x) => x.count > 0)
    : [];

  return (
    <div>
      {selectable && (
        <div className="mb-3 flex justify-end">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
          >
            <option value="">{selectPlaceholder}</option>
            {totals.map((t) => (
              <option key={t.key} value={t.key}>
                {t.key}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2.5">
        {visible.map((t) => (
          <div key={t.key} className="grid grid-cols-[minmax(0,1fr)_42px] items-center gap-3 sm:grid-cols-[200px_1fr_42px]">
            <span className="text-xs font-medium leading-tight text-[var(--text-secondary)] sm:truncate" title={t.key}>
              {t.key}
            </span>
            <div className="col-span-2 flex h-4 overflow-hidden rounded bg-[var(--surface-sunken)] sm:col-span-1">
              {STATUS_ORDER.map((st) => {
                const c = lookup[t.key]?.[st] || 0;
                if (!c) return null;
                const pct = (c / max) * 100;
                return (
                  <div
                    key={st}
                    className="animate-grow-width transition-[filter] duration-150 hover:brightness-110"
                    style={{ width: `${pct}%`, background: STATUS_COLOR[st] }}
                    onMouseMove={(e) => show(e, [t.key, `${st}: ${c.toLocaleString('es-CO')}`])}
                    onMouseLeave={hide}
                  />
                );
              })}
            </div>
            <span className="hidden text-right text-xs tabular-nums text-[var(--text-secondary)] sm:inline">
              {t.count.toLocaleString('es-CO')}
            </span>
          </div>
        ))}
      </div>

      {selected && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-3">
          {selectedBreakdown.map(({ st, count }) => (
            <span
              key={st}
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={{ background: `${STATUS_COLOR[st]}2e`, color: STATUS_COLOR[st] }}
            >
              {st}: {count.toLocaleString('es-CO')}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {STATUS_ORDER.map((st) => (
          <span key={st} className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: STATUS_COLOR[st] }} />
            {st}
          </span>
        ))}
      </div>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}
