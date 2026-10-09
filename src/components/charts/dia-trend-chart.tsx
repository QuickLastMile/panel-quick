'use client';

import { useMemo, useState } from 'react';
import MultiTrendLineChart from './multi-trend-line-chart';
import TrendLineChart from './trend-line-chart';
import { STATUS_ORDER, STATUS_COLOR } from '@/lib/status-colors';
import type { DiaProyectoPoint } from '@/lib/aggregate';

export default function DiaTrendChart({
  diaProyecto,
  defaultMode = 'estado',
}: {
  diaProyecto: DiaProyectoPoint[];
  defaultMode?: 'estado' | 'total';
}) {
  const [mes, setMes] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [modo, setModo] = useState<'estado' | 'total'>(defaultMode);

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

  // Mismas fechas que `series`, pero sin separar por estado — una sola línea
  // con el total del día, y el desglose por estado se muestra al pasar el
  // mouse (tooltip), sin crear una gráfica nueva.
  const total = useMemo(() => {
    const fechas = new Map<string, string>();
    const totalByFecha: Record<string, number> = {};
    const porEstadoByFecha: Record<string, Record<string, number>> = {};
    diaProyecto.forEach((p) => {
      if (mes && p.mes !== mes) return;
      if (proyecto && p.proyecto !== proyecto) return;
      fechas.set(p.fecha, p.fechaLabel);
      totalByFecha[p.fecha] = (totalByFecha[p.fecha] || 0) + p.count;
      if (!porEstadoByFecha[p.fecha]) porEstadoByFecha[p.fecha] = {};
      porEstadoByFecha[p.fecha][p.estado] = (porEstadoByFecha[p.fecha][p.estado] || 0) + p.count;
    });
    const fechaKeys = Array.from(fechas.keys()).sort((a, b) => a.localeCompare(b));
    return {
      points: fechaKeys.map((f) => ({ label: fechas.get(f) || f, value: totalByFecha[f] || 0 })),
      extraLines: (idx: number) => {
        const f = fechaKeys[idx];
        const porEstado = porEstadoByFecha[f] || {};
        return STATUS_ORDER.filter((e) => porEstado[e]).map((e) => `${e}: ${porEstado[e].toLocaleString('es-CO')}`);
      },
    };
  }, [diaProyecto, mes, proyecto]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-[var(--surface-sunken)] p-1">
          <button
            onClick={() => setModo('estado')}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all duration-150 ${
              modo === 'estado'
                ? 'bg-gradient-gold text-[#141008] shadow-[0_0_12px_rgba(214,164,25,0.25)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            Por estado
          </button>
          <button
            onClick={() => setModo('total')}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all duration-150 ${
              modo === 'total'
                ? 'bg-gradient-gold text-[#141008] shadow-[0_0_12px_rgba(214,164,25,0.25)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            Total
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
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
      </div>
      {modo === 'estado' ? (
        <MultiTrendLineChart series={series} emptyMessage="Sin servicios para este filtro." />
      ) : (
        <TrendLineChart points={total.points} extraLines={total.extraLines} emptyMessage="Sin servicios para este filtro." />
      )}
    </div>
  );
}
