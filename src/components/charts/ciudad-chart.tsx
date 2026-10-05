'use client';

import { useMemo, useState } from 'react';
import StackedBarList from './stacked-bar-list';

type Row = { ciudad: string; proyecto: string; estado: string; count: number };

export default function CiudadChart({ ciudadProyectoEstado, proyectos }: { ciudadProyectoEstado: Row[]; proyectos: string[] }) {
  const [proyecto, setProyecto] = useState('');

  const filtered = useMemo(
    () => (proyecto ? ciudadProyectoEstado.filter((r) => r.proyecto === proyecto) : ciudadProyectoEstado),
    [ciudadProyectoEstado, proyecto]
  );

  const { totals, byKey } = useMemo(() => {
    const totalsMap: Record<string, number> = {};
    const byKeyMap: Record<string, number> = {};
    filtered.forEach((r) => {
      totalsMap[r.ciudad] = (totalsMap[r.ciudad] || 0) + r.count;
      const k = `${r.ciudad}|||${r.estado}`;
      byKeyMap[k] = (byKeyMap[k] || 0) + r.count;
    });
    return {
      totals: Object.entries(totalsMap)
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count),
      byKey: Object.entries(byKeyMap).map(([k, count]) => {
        const [ciudad, estado] = k.split('|||');
        return { proyecto: ciudad, estado, count };
      }),
    };
  }, [filtered]);

  return (
    <div>
      <div className="mb-3 flex justify-end">
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
      {totals.length ? (
        <StackedBarList totals={totals} byKey={byKey} selectable selectPlaceholder="Top 14 ciudades" />
      ) : (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin servicios para este filtro.</p>
      )}
    </div>
  );
}
