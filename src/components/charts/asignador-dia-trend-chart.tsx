'use client';

import { useMemo, useState } from 'react';
import MultiTrendLineChart from './multi-trend-line-chart';
import type { DiaTipoPoint } from '@/lib/aggregate';

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

export default function AsignadorDiaTrendChart({ diaTipo }: { diaTipo: DiaTipoPoint[] }) {
  const [mes, setMes] = useState('');

  const meses = useMemo(() => {
    const map = new Map<string, string>();
    diaTipo.forEach((p) => map.set(p.mes, p.mesLabel));
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [diaTipo]);

  const series = useMemo(() => {
    const fechas = new Map<string, string>();
    diaTipo.forEach((p) => {
      if (mes && p.mes !== mes) return;
      fechas.set(p.fecha, p.fechaLabel);
    });
    const fechaKeys = Array.from(fechas.keys()).sort((a, b) => a.localeCompare(b));

    return TIPO_ORDER.map((tipo) => {
      const byFecha: Record<string, number> = {};
      diaTipo.forEach((p) => {
        if (p.tipo !== tipo) return;
        if (mes && p.mes !== mes) return;
        byFecha[p.fecha] = (byFecha[p.fecha] || 0) + p.count;
      });
      return {
        key: tipo,
        label: TIPO_LABEL[tipo] || tipo,
        color: TIPO_COLOR[tipo] || '#8a8a8a',
        points: fechaKeys.map((f) => ({ label: fechas.get(f) || f, value: byFecha[f] || 0 })),
      };
    });
  }, [diaTipo, mes]);

  return (
    <div>
      <div className="mb-4 flex justify-end">
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
      </div>
      <MultiTrendLineChart series={series} emptyMessage="Sin servicios para este filtro." />
    </div>
  );
}
