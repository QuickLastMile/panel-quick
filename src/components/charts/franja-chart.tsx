'use client';

import { useMemo, useState } from 'react';
import TrendLineChart from './trend-line-chart';

type HoraCiudadPoint = { ciudad: string; proyecto: string; hora: number; fuente: 'servicio' | 'creacion'; count: number };

const MAX_PROYECTOS_TOOLTIP = 6;

export default function FranjaChart({
  horaCiudad,
  ciudades,
  proyectos,
}: {
  horaCiudad: HoraCiudadPoint[];
  ciudades: string[];
  proyectos: string[];
}) {
  const [ciudad, setCiudad] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [fuente, setFuente] = useState<'servicio' | 'creacion'>('servicio');

  const filtered = useMemo(
    () => horaCiudad.filter((p) => p.fuente === fuente && (!ciudad || p.ciudad === ciudad) && (!proyecto || p.proyecto === proyecto)),
    [horaCiudad, fuente, ciudad, proyecto]
  );

  const { points, start } = useMemo(() => {
    const byHour = new Array(24).fill(0);
    filtered.forEach((p) => {
      byHour[p.hora] += p.count;
    });
    // Recorta las horas sin datos al inicio/fin (ej. de 2am a 5am nadie pide
    // servicios) en vez de siempre mostrar el rango fijo 00h-23h.
    let s = byHour.findIndex((v) => v > 0);
    let end = byHour.length - 1 - [...byHour].reverse().findIndex((v) => v > 0);
    if (s === -1) {
      s = 0;
      end = 23;
    }
    return {
      start: s,
      points: byHour.slice(s, end + 1).map((value, i) => ({ label: `${String(s + i).padStart(2, '0')}:00`, value })),
    };
  }, [filtered]);

  // Desglose por proyecto a cada hora — ignora el filtro de proyecto (que
  // es solo para enfocar la línea principal) para que sirva como
  // herramienta de validación de verdad: "quién está creando a esta hora".
  const porHoraProyecto = useMemo(() => {
    const base = horaCiudad.filter((p) => p.fuente === fuente && (!ciudad || p.ciudad === ciudad));
    const map: Record<number, Record<string, number>> = {};
    base.forEach((p) => {
      map[p.hora] = map[p.hora] || {};
      map[p.hora][p.proyecto] = (map[p.hora][p.proyecto] || 0) + p.count;
    });
    return map;
  }, [horaCiudad, fuente, ciudad]);

  function extraLines(idx: number): string[] {
    const hora = start + idx;
    const byProyecto = porHoraProyecto[hora];
    if (!byProyecto) return [];
    const sorted = Object.entries(byProyecto).sort(([, a], [, b]) => b - a);
    const top = sorted.slice(0, MAX_PROYECTOS_TOOLTIP);
    const lines = top.map(([p, c]) => `${p}: ${c.toLocaleString('es-CO')}`);
    if (sorted.length > MAX_PROYECTOS_TOOLTIP) lines.push(`+${sorted.length - MAX_PROYECTOS_TOOLTIP} proyecto(s) más`);
    return lines;
  }

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
      <p className="mb-2 text-[11px] text-[var(--text-muted)]">
        Pasa el mouse sobre un punto para ver qué proyectos están {fuente === 'creacion' ? 'solicitando' : 'agendados'} a esa hora.
      </p>
      <TrendLineChart points={points} extraLines={extraLines} />
    </div>
  );
}
