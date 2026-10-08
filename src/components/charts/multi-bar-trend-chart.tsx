'use client';

import { useRef, useState } from 'react';
import { useChartTooltip, ChartTooltip } from './chart-tooltip';
import { niceTicks } from './chart-math';
import type { TrendSeries } from './multi-trend-line-chart';

export default function MultiBarTrendChart({
  series,
  height = 260,
  valueFormatter = (v: number) => v.toLocaleString('es-CO'),
  emptyMessage = 'Sin datos para este filtro.',
}: {
  series: TrendSeries[];
  height?: number;
  valueFormatter?: (v: number) => string;
  emptyMessage?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const { tooltip, show, hide } = useChartTooltip();

  const active = series.filter((s) => s.points.some((p) => p.value > 0));
  const n = active[0]?.points.length || 0;

  if (!active.length || !n) {
    return <p className="py-10 text-center text-sm text-[var(--text-muted)]">{emptyMessage}</p>;
  }

  const W = 1000;
  const H = 280;
  const PAD_BOTTOM = 8;
  const max = Math.max(...active.flatMap((s) => s.points.map((p) => p.value)), 1);
  const ticks = niceTicks(max);
  const yFor = (v: number) => H - PAD_BOTTOM - (v / max) * (H - 14 - PAD_BOTTOM);

  const band = W / n;
  const groupWidth = Math.min(band * 0.72, 56 * active.length);
  const barWidth = groupWidth / active.length;
  const labels = active[0].points.map((p) => p.label);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const fraction = (e.clientX - rect.left) / rect.width;
    const idx = Math.min(n - 1, Math.max(0, Math.floor(fraction * n)));
    setHoverIdx(idx);
    const lines = [labels[idx], ...active.filter((s) => s.points[idx].value > 0).map((s) => `${s.label}: ${valueFormatter(s.points[idx].value)}`)];
    show(e, lines);
  }

  return (
    <div>
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
          <div
            ref={ref}
            className="relative w-full select-none"
            style={{ height }}
            onMouseMove={onMove}
            onMouseLeave={() => {
              setHoverIdx(null);
              hide();
            }}
          >
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
              {hoverIdx !== null && (
                <rect
                  x={hoverIdx * band}
                  y={0}
                  width={band}
                  height={H}
                  fill="var(--border)"
                  opacity={0.25}
                />
              )}
              {active.map((s, j) =>
                s.points.map((p, i) => {
                  const x = i * band + (band - groupWidth) / 2 + j * barWidth;
                  const y = yFor(p.value);
                  return (
                    <rect
                      key={`${s.key}-${i}`}
                      x={x + 1}
                      y={y}
                      width={Math.max(barWidth - 2, 1)}
                      height={Math.max(H - PAD_BOTTOM - y, 0)}
                      rx={3}
                      fill={s.color}
                      className="transition-[filter] duration-150 hover:brightness-110"
                    />
                  );
                })
              )}
            </svg>
          </div>
          <div className="mt-1.5 flex text-[10px] text-[var(--text-muted)]">
            {labels.map((l, i) => (
              <span key={i} className="text-center" style={{ width: `${100 / n}%` }}>
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {active.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}
