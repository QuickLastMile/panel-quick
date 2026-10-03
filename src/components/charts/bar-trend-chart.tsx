'use client';

import { useChartTooltip, ChartTooltip } from './chart-tooltip';
import { niceTicks } from './chart-math';

export default function BarTrendChart({
  points,
  height = 240,
  valueFormatter = (v: number) => v.toLocaleString('es-CO'),
  emptyMessage = 'Sin datos para este filtro.',
}: {
  points: { label: string; value: number }[];
  height?: number;
  valueFormatter?: (v: number) => string;
  emptyMessage?: string;
}) {
  const { tooltip, show, hide } = useChartTooltip();
  const n = points.length;

  if (!n || points.every((p) => p.value === 0)) {
    return <p className="py-10 text-center text-sm text-[var(--text-muted)]">{emptyMessage}</p>;
  }

  const W = 1000;
  const H = 280;
  const PAD_BOTTOM = 8;
  const max = Math.max(...points.map((p) => p.value), 1);
  const ticks = niceTicks(max);
  const yFor = (v: number) => H - PAD_BOTTOM - (v / max) * (H - 14 - PAD_BOTTOM);

  const band = W / n;
  const barWidth = Math.min(band * 0.5, 64);

  return (
    <div className="flex gap-3">
      <div className="flex flex-col justify-between py-1 text-right text-[10px] tabular-nums text-[var(--text-muted)]" style={{ height }}>
        {ticks
          .slice()
          .reverse()
          .map((t, i) => (
            <span key={i}>{valueFormatter(Math.round(t))}</span>
          ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="relative w-full" style={{ height }}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
            {ticks.map((t, i) => (
              <line
                key={i}
                x1={0}
                y1={yFor(t)}
                x2={W}
                y2={yFor(t)}
                stroke="var(--border)"
                strokeWidth={1}
                strokeDasharray="4 5"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {points.map((p, i) => {
              const x = i * band + band / 2 - barWidth / 2;
              const y = yFor(p.value);
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(H - PAD_BOTTOM - y, 0)}
                  rx={4}
                  fill="url(#barGold)"
                  className="cursor-pointer transition-[filter] duration-150 hover:brightness-110"
                  onMouseMove={(e) => show(e, [p.label, valueFormatter(p.value)])}
                  onMouseLeave={hide}
                />
              );
            })}
            <defs>
              <linearGradient id="barGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f3c94f" />
                <stop offset="100%" stopColor="#86590a" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="mt-1.5 flex text-[10px] text-[var(--text-muted)]">
          {points.map((p, i) => (
            <span key={i} className="text-center" style={{ width: `${100 / n}%` }}>
              {p.label}
            </span>
          ))}
        </div>
      </div>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}
