'use client';

import { useMemo, useState } from 'react';
import BarTrendChart from './bar-trend-chart';
import type { MesProyectoPoint } from '@/lib/aggregate';

export default function MesChart({ mesProyecto }: { mesProyecto: MesProyectoPoint[] }) {
  const [proyecto, setProyecto] = useState('');

  const proyectos = useMemo(() => {
    const set = new Set<string>();
    mesProyecto.forEach((p) => set.add(p.proyecto));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [mesProyecto]);

  const points = useMemo(() => {
    const map: Record<string, { label: string; value: number }> = {};
    mesProyecto.forEach((p) => {
      if (proyecto && p.proyecto !== proyecto) return;
      if (!map[p.mes]) map[p.mes] = { label: p.mesLabel, value: 0 };
      map[p.mes].value += p.count;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [mesProyecto, proyecto]);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <select
          value={proyecto}
          onChange={(e) => setProyecto(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
        >
          <option value="">Todos los proyectos</option>
          {proyectos.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <BarTrendChart points={points} emptyMessage="Aún no hay histórico suficiente para mostrar tendencia mensual." />
    </div>
  );
}
