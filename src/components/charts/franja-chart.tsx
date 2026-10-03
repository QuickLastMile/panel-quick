'use client';

import { useMemo, useState } from 'react';
import TrendLineChart from './trend-line-chart';

type HoraCiudadPoint = { ciudad: string; hora: number; fuente: 'servicio' | 'creacion'; count: number };

export default function FranjaChart({
  horaCiudad,
  ciudades,
}: {
  horaCiudad: HoraCiudadPoint[];
  ciudades: string[];
}) {
  const [ciudad, setCiudad] = useState('');
  const [fuente, setFuente] = useState<'servicio' | 'creacion'>('servicio');

  const points = useMemo(() => {
    const byHour = new Array(24).fill(0);
    horaCiudad.forEach((p) => {
      if (p.fuente !== fuente) return;
      if (ciudad && p.ciudad !== ciudad) return;
      byHour[p.hora] += p.count;
    });
    return byHour.map((value, hora) => ({ label: `${String(hora).padStart(2, '0')}h`, value }));
  }, [horaCiudad, ciudad, fuente]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-[var(--surface-sunken)] p-1">
          <button
            onClick={() => setFuente('servicio')}
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all duration-150 ${
              fuente === 'servicio' ? 'bg-gradient-gold text-[#141008]' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            Hora de servicio
          </button>
          <button
            onClick={() => setFuente('creacion')}
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all duration-150 ${
              fuente === 'creacion' ? 'bg-gradient-gold text-[#141008]' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            Hora de solicitud
          </button>
        </div>
        <select
          value={ciudad}
          onChange={(e) => setCiudad(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
        >
          <option value="">Todas las ciudades</option>
          {ciudades.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <TrendLineChart points={points} />
    </div>
  );
}
