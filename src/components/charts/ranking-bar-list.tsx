'use client';

import { useChartTooltip, ChartTooltip } from './chart-tooltip';

export default function RankingBarList({
  items,
  color,
  formatValue = (v: number) => v.toLocaleString('es-CO'),
}: {
  items: { key: string; count: number }[];
  color?: string;
  // Formatea el número mostrado (ancho de barra sigue usando `count` crudo)
  // — ej. minutos como "01:23:00" en vez de "83".
  formatValue?: (count: number) => string;
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
              onMouseMove={(e) => show(e, [item.key, formatValue(item.count)])}
              onMouseLeave={hide}
            />
          </div>
          <span className="hidden text-right text-xs tabular-nums text-[var(--text-secondary)] sm:inline">
            {formatValue(item.count)}
          </span>
        </div>
      ))}
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}
