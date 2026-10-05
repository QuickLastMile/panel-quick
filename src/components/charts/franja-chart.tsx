'use client';

import { useMemo, useState } from 'react';
import { LineChart, Table2 } from 'lucide-react';
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
  const [view, setView] = useState<'grafica' | 'tabla'>('grafica');

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

  // Tabla dinámica: proyecto × hora — misma data que el desglose del
  // tooltip, pero completa y sin tener que pasar el mouse punto por punto.
  const tabla = useMemo(() => {
    if (view !== 'tabla') return null;
    const proyectoTotals: Record<string, number> = {};
    const cellMap: Record<string, number> = {};
    filtered.forEach((p) => {
      proyectoTotals[p.proyecto] = (proyectoTotals[p.proyecto] || 0) + p.count;
      const k = `${p.proyecto}|||${p.hora}`;
      cellMap[k] = (cellMap[k] || 0) + p.count;
    });
    const proyectosSorted = Object.entries(proyectoTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([p]) => p);
    const horas = points.map((_, i) => start + i);
    return { proyectosSorted, cellMap, horas, totalesPorHora: points.map((p) => p.value) };
  }, [view, filtered, points, start]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-[var(--surface-sunken)] p-1">
          <button
            onClick={() => setView('grafica')}
            title="Gráfica de tendencia"
            className={`rounded-md p-1.5 transition-all duration-150 ${
              view === 'grafica' ? 'bg-gradient-gold text-[#141008]' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            <LineChart size={14} />
          </button>
          <button
            onClick={() => setView('tabla')}
            title="Tabla detallada"
            className={`rounded-md p-1.5 transition-all duration-150 ${
              view === 'tabla' ? 'bg-gradient-gold text-[#141008]' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            <Table2 size={14} />
          </button>
        </div>
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

      {view === 'grafica' ? (
        <>
          <p className="mb-2 text-[11px] text-[var(--text-muted)]">
            Pasa el mouse sobre un punto para ver qué proyectos están {fuente === 'creacion' ? 'solicitando' : 'agendados'} a esa hora.
          </p>
          <TrendLineChart points={points} extraLines={extraLines} />
        </>
      ) : tabla && tabla.proyectosSorted.length ? (
        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 border-b border-r border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  Proyecto
                </th>
                {tabla.horas.map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-2.5 text-right text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]"
                  >
                    {String(h).padStart(2, '0')}h
                  </th>
                ))}
                <th className="whitespace-nowrap border-b border-l border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2.5 text-right text-[10.5px] font-bold uppercase tracking-wide text-[var(--accent-bright)]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {tabla.proyectosSorted.map((p) => {
                const rowTotal = tabla.horas.reduce((sum, h) => sum + (tabla.cellMap[`${p}|||${h}`] || 0), 0);
                return (
                  <tr key={p} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]">
                    <td className="sticky left-0 whitespace-nowrap border-r border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-semibold text-[var(--text)]">
                      {p}
                    </td>
                    {tabla.horas.map((h) => {
                      const c = tabla.cellMap[`${p}|||${h}`] || 0;
                      return (
                        <td key={h} className="px-2.5 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                          {c || <span className="text-[var(--text-muted)]">—</span>}
                        </td>
                      );
                    })}
                    <td className="border-l border-[var(--border)] px-3 py-2 text-right font-bold tabular-nums text-[var(--accent-bright)]">
                      {rowTotal.toLocaleString('es-CO')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-[var(--border-strong)]">
                <td className="sticky left-0 whitespace-nowrap border-r border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 font-bold text-[var(--text)]">
                  Total
                </td>
                {tabla.totalesPorHora.map((v, i) => (
                  <td key={i} className="bg-[var(--surface-sunken)] px-2.5 py-2 text-right font-bold tabular-nums text-[var(--text)]">
                    {v.toLocaleString('es-CO')}
                  </td>
                ))}
                <td className="border-l border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 text-right font-bold tabular-nums text-[var(--accent-bright)]">
                  {tabla.totalesPorHora.reduce((a, b) => a + b, 0).toLocaleString('es-CO')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-[var(--text-muted)]">Sin datos para este filtro.</p>
      )}
    </div>
  );
}
