'use client';

import { useChartTooltip, ChartTooltip } from './chart-tooltip';

export default function RankingBarList({
  items,
  color,
}: {
  items: { key: string; count: number }[];
  color?: string;
}) {
  const { tooltip, show, hide } = useChartTooltip();
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.key} className="grid grid-cols-[minmax(0,1fr)_42px] items-center gap-3 sm:grid-cols-[210px_1fr_42px]">
          <span className="text-xs font-medium leading-tight text-[var(--text-secondary)]" title={item.key}>
            {item.key}
          </span>
          <div className="col-span-2 h-4 overflow-hidden rounded bg-[var(--surface-sunken)] sm:col-span-1">
            <div
              className={`h-full rounded transition-[filter] duration-150 hover:brightness-110 ${!color ? 'animate-grow-width bg-gradient-gold' : 'animate-grow-width'}`}
              style={{ width: `${(item.count / max) * 100}%`, background: color }}
              onMouseMove={(e) => show(e, [item.key, item.count.toLocaleString('es-CO')])}
              onMouseLeave={hide}
            />
          </div>
          <span className="hidden text-right text-xs tabular-nums text-[var(--text-secondary)] sm:inline">
            {item.count.toLocaleString('es-CO')}
          </span>
        </div>
      ))}
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}
