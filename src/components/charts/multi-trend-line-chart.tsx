'use client';

import { useRef, useState } from 'react';
import { useChartTooltip, ChartTooltip } from './chart-tooltip';
import { smoothPath, niceTicks } from './chart-math';

export type TrendSeries = { key: string; label: string; color: string; points: { label: string; value: number }[] };

export default function MultiTrendLineChart({
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
  const PAD_TOP = 14;
  const PAD_BOTTOM = 8;
  const max = Math.max(...active.flatMap((s) => s.points.map((p) => p.value)), 1);
  const ticks = niceTicks(max);
  const stepX = n > 1 ? W / (n - 1) : 0;
  const yFor = (v: number) => H - PAD_BOTTOM - (v / max) * (H - PAD_TOP - PAD_BOTTOM);

  const seriesCoords = active.map((s) => ({
    ...s,
    coords: s.points.map((p, i) => ({ x: n > 1 ? i * stepX : W / 2, y: yFor(p.value) })),
  }));

  const labels = active[0].points.map((p) => p.label);
  const labelStride = n > 16 ? Math.ceil(n / 16) : 1;

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const fraction = (e.clientX - rect.left) / rect.width;
    const idx = Math.min(n - 1, Math.max(0, Math.round(fraction * (n - 1))));
    setHoverIdx(idx);
    const lines = [
      labels[idx],
      ...seriesCoords
        .filter((s) => s.points[idx].value > 0)
        .map((s) => `${s.label}: ${valueFormatter(s.points[idx].value)}`),
    ];
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
                <line
                  x1={hoverIdx * stepX}
                  y1={PAD_TOP}
                  x2={hoverIdx * stepX}
                  y2={H}
                  stroke="var(--border-strong)"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {seriesCoords.map((s) => (
                <path
                  key={s.key}
                  d={smoothPath(s.coords)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {seriesCoords.map((s) =>
                s.coords.map((c, i) => (
                  <circle
                    key={`${s.key}-${i}`}
                    cx={c.x}
                    cy={c.y}
                    r={hoverIdx === i ? 5 : 3}
                    fill={hoverIdx === i ? s.color : 'var(--surface)'}
                    stroke={s.color}
                    strokeWidth={1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                ))
              )}
            </svg>
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-[var(--text-muted)]">
            {labels.map((l, i) => (
              <span key={i} className={i % labelStride !== 0 && i !== n - 1 ? 'invisible' : ''}>
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
