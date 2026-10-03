'use client';

import { useRef, useState } from 'react';
import { useChartTooltip, ChartTooltip } from './chart-tooltip';
import { smoothPath } from './chart-math';

export default function TrendLineChart({
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
  const ref = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const { tooltip, show, hide } = useChartTooltip();

  const n = points.length;

  if (!n || points.every((p) => p.value === 0)) {
    return <p className="py-10 text-center text-sm text-[var(--text-muted)]">{emptyMessage}</p>;
  }

  const W = 1000;
  const H = 280;
  const PAD_TOP = 14;
  const PAD_BOTTOM = 8;
  const max = Math.max(...points.map((p) => p.value), 1);
  const TICK_COUNT = 4;
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => (max * i) / TICK_COUNT);

  const stepX = n > 1 ? W / (n - 1) : 0;
  const yFor = (v: number) => H - PAD_BOTTOM - (v / max) * (H - PAD_TOP - PAD_BOTTOM);
  const coords = points.map((p, i) => ({ x: n > 1 ? i * stepX : W / 2, y: yFor(p.value) }));
  const linePath = smoothPath(coords);
  const areaPath = `${linePath} L${coords[n - 1].x.toFixed(1)},${H} L${coords[0].x.toFixed(1)},${H} Z`;

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const fraction = (e.clientX - rect.left) / rect.width;
    const idx = Math.min(n - 1, Math.max(0, Math.round(fraction * (n - 1))));
    setHoverIdx(idx);
    show(e, [points[idx].label, valueFormatter(points[idx].value)]);
  }

  const labelStride = n > 16 ? Math.ceil(n / 16) : 1;

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
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f3c94f" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f3c94f" stopOpacity="0" />
              </linearGradient>
            </defs>

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

            <path d={areaPath} fill="url(#trendFill)" />
            <path
              d={linePath}
              fill="none"
              stroke="#d6a419"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {hoverIdx !== null && (
              <line
                x1={coords[hoverIdx].x}
                y1={PAD_TOP}
                x2={coords[hoverIdx].x}
                y2={H}
                stroke="var(--border-strong)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            )}
            {coords.map((c, i) => (
              <circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={hoverIdx === i ? 6 : 4}
                fill={hoverIdx === i ? '#f3c94f' : 'var(--surface)'}
                stroke="#d6a419"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-[var(--text-muted)]">
          {points.map((p, i) => (
            <span key={i} className={i % labelStride !== 0 && i !== n - 1 ? 'invisible' : ''}>
              {p.label}
            </span>
          ))}
        </div>
      </div>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}
