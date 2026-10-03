'use client';

import { useRef, useState } from 'react';
import { useChartTooltip, ChartTooltip } from './chart-tooltip';

export default function TrendLineChart({
  points,
  height = 220,
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
  const PAD_TOP = 16;
  const PAD_BOTTOM = 10;
  const max = Math.max(...points.map((p) => p.value), 1);
  const stepX = n > 1 ? W / (n - 1) : 0;
  const coords = points.map((p, i) => ({
    x: n > 1 ? i * stepX : W / 2,
    y: H - PAD_BOTTOM - (p.value / max) * (H - PAD_TOP - PAD_BOTTOM),
  }));
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
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
            <stop offset="0%" stopColor="#f3c94f" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f3c94f" stopOpacity="0" />
          </linearGradient>
        </defs>
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
            y1={0}
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
            r={hoverIdx === i ? 6 : 3.5}
            fill={hoverIdx === i ? '#f3c94f' : '#d6a419'}
            stroke="#0a0a0b"
            strokeWidth={hoverIdx === i ? 2 : 1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      <div className="mt-1.5 flex justify-between text-[10px] text-[var(--text-muted)]">
        {points.map((p, i) => (
          <span key={i} className={i % labelStride !== 0 && i !== n - 1 ? 'invisible' : ''}>
            {p.label}
          </span>
        ))}
      </div>
      <ChartTooltip tooltip={tooltip} />
    </div>
  );
}
