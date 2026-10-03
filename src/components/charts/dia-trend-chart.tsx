'use client';

import { useMemo, useState } from 'react';
import MultiTrendLineChart from './multi-trend-line-chart';
import { STATUS_ORDER, STATUS_COLOR } from '@/lib/status-colors';
import type { DiaProyectoPoint } from '@/lib/aggregate';

export default function DiaTrendChart({ diaProyecto }: { diaProyecto: DiaProyectoPoint[] }) {
  const [mes, setMes] = useState('');
  const [proyecto, setProyecto] = useState('');

  const meses = useMemo(() => {
    const map = new Map<string, string>();
    diaProyecto.forEach((p) => map.set(p.mes, p.mesLabel));
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [diaProyecto]);

  const proyectos = useMemo(() => {
    const set = new Set<string>();
    diaProyecto.forEach((p) => {
      if (!mes || p.mes === mes) set.add(p.proyecto);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [diaProyecto, mes]);

  const series = useMemo(() => {
    const fechas = new Map<string, string>();
    diaProyecto.forEach((p) => {
      if (mes && p.mes !== mes) return;
      if (proyecto && p.proyecto !== proyecto) return;
      fechas.set(p.fecha, p.fechaLabel);
    });
    const fechaKeys = Array.from(fechas.keys()).sort((a, b) => a.localeCompare(b));

    return STATUS_ORDER.map((estado) => {
      const byFecha: Record<string, number> = {};
      diaProyecto.forEach((p) => {
        if (p.estado !== estado) return;
        if (mes && p.mes !== mes) return;
        if (proyecto && p.proyecto !== proyecto) return;
        byFecha[p.fecha] = (byFecha[p.fecha] || 0) + p.count;
      });
      return {
        key: estado,
        label: estado,
        color: STATUS_COLOR[estado] || '#8a8a8a',
        points: fechaKeys.map((f) => ({ label: fechas.get(f) || f, value: byFecha[f] || 0 })),
      };
    });
  }, [diaProyecto, mes, proyecto]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <select
          value={mes}
          onChange={(e) => {
            setMes(e.target.value);
            setProyecto('');
          }}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
        >
          <option value="">Todos los meses</option>
          {meses.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
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
      <MultiTrendLineChart series={series} emptyMessage="Sin servicios para este filtro." />
    </div>
  );
}
