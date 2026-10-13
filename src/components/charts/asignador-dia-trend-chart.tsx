'use client';

import { useMemo, useState } from 'react';
import MultiTrendLineChart from './multi-trend-line-chart';
import type { DiaTipoPoint } from '@/lib/aggregate';
import type { DateFilter } from '@/lib/date-filter';

const TIPO_COLOR: Record<string, string> = {
  AGILIZADOR: '#f3c94f',
  COORDINADOR: '#4f9df5',
  OTRO: '#8a8a8a',
};
const TIPO_LABEL: Record<string, string> = {
  AGILIZADOR: 'Agilizador',
  COORDINADOR: 'Administrativo',
  OTRO: 'Otro / externo',
};
const TIPO_ORDER = ['AGILIZADOR', 'COORDINADOR', 'OTRO'];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export default function AsignadorDiaTrendChart({ diaTipo, pageFilter }: { diaTipo: DiaTipoPoint[]; pageFilter: DateFilter }) {
  const [mes, setMes] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');

  // Cuando el filtro de la página está en modo "Rango", ese rango manda
  // sobre esta gráfica (y se oculta el selector de mes propio) — fuera de
  // "Rango" la gráfica sigue siendo histórico completo con su filtro de mes.
  const rangeBounds = useMemo(() => {
    if (pageFilter.mode !== 'range') return null;
    const a = `${pageFilter.year}-${pad2(pageFilter.month)}-${pad2(pageFilter.day)}`;
    const b = `${pageFilter.endYear ?? pageFilter.year}-${pad2(pageFilter.endMonth ?? pageFilter.month)}-${pad2(pageFilter.endDay ?? pageFilter.day)}`;
    return a <= b ? ([a, b] as const) : ([b, a] as const);
  }, [pageFilter]);

  const scopedDiaTipo = useMemo(() => {
    if (!rangeBounds) return diaTipo;
    const [lo, hi] = rangeBounds;
    return diaTipo.filter((p) => p.fecha >= lo && p.fecha <= hi);
  }, [diaTipo, rangeBounds]);

  const meses = useMemo(() => {
    const map = new Map<string, string>();
    scopedDiaTipo.forEach((p) => map.set(p.mes, p.mesLabel));
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [scopedDiaTipo]);

  const tiposAMostrar = tipoFiltro ? [tipoFiltro] : TIPO_ORDER;

  const series = useMemo(() => {
    const fechas = new Map<string, string>();
    scopedDiaTipo.forEach((p) => {
      if (!rangeBounds && mes && p.mes !== mes) return;
      fechas.set(p.fecha, p.fechaLabel);
    });
    const fechaKeys = Array.from(fechas.keys()).sort((a, b) => a.localeCompare(b));

    return tiposAMostrar.map((tipo) => {
      const byFecha: Record<string, number> = {};
      scopedDiaTipo.forEach((p) => {
        if (p.tipo !== tipo) return;
        if (!rangeBounds && mes && p.mes !== mes) return;
        byFecha[p.fecha] = (byFecha[p.fecha] || 0) + p.count;
      });
      return {
        key: tipo,
        label: TIPO_LABEL[tipo] || tipo,
        color: TIPO_COLOR[tipo] || '#8a8a8a',
        points: fechaKeys.map((f) => ({ label: fechas.get(f) || f, value: byFecha[f] || 0 })),
      };
    });
  }, [scopedDiaTipo, mes, rangeBounds, tiposAMostrar]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        {rangeBounds ? (
          <span className="text-xs font-semibold text-[var(--accent-bright)]">
            Rango del filtro de arriba: {rangeBounds[0]} al {rangeBounds[1]}
          </span>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap gap-2">
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
          >
            <option value="">Todos (Agilizador/Admin./Otro)</option>
            {TIPO_ORDER.map((t) => (
              <option key={t} value={t}>
                {TIPO_LABEL[t]}
              </option>
            ))}
          </select>
          {!rangeBounds && (
            <select
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
            >
              <option value="">Todos los meses</option>
              {meses.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      <MultiTrendLineChart series={series} emptyMessage="Sin servicios para este filtro." />
    </div>
  );
}
