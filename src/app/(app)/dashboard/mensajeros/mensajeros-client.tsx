'use client';

import { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import type { ServiceRow } from '@/lib/sheets';
import { buildMensajeroStats } from '@/lib/aggregate';
import { STATUS_COLOR } from '@/lib/status-colors';
import ChartCard from '@/components/charts/chart-card';
import RankingBarList from '@/components/charts/ranking-bar-list';

const EN_PROCESO_COLOR = STATUS_COLOR['Asignado'];

export default function MensajerosClient({ rows }: { rows: ServiceRow[] }) {
  const [proyecto, setProyecto] = useState('');

  const proyectos = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.proyecto) set.add(r.proyecto);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [rows]);

  const filteredRows = useMemo(() => (proyecto ? rows.filter((r) => r.proyecto === proyecto) : rows), [rows, proyecto]);
  const stats = useMemo(() => buildMensajeroStats(filteredRows), [filteredRows]);
  const top = stats[0];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-2.5">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Proyecto</span>
          <select
            value={proyecto}
            onChange={(e) => setProyecto(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
          >
            <option value="">Todos</option>
            {proyectos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        {proyecto && (
          <button onClick={() => setProyecto('')} className="text-xs font-semibold text-[var(--accent-bright)] hover:underline">
            Limpiar filtro
          </button>
        )}
      </div>

      {top && top.finalizado > 0 && (
        <div className="panel-card mb-5 flex items-center gap-4 rounded-xl border-[var(--accent)] p-5">
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gradient-gold text-[#141008] shadow-[0_0_18px_rgba(214,164,25,0.25)]">
            <Trophy size={22} />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--accent-bright)]">
              {proyecto ? `Más productivo en ${proyecto}` : 'Más productivo — todos los proyectos'}
            </p>
            <p className="text-lg font-bold text-[var(--text)]">{top.nombreTrabajador}</p>
            <p className="text-xs text-[var(--text-muted)]">{top.finalizado.toLocaleString('es-CO')} servicios finalizados</p>
          </div>
        </div>
      )}

      <ChartCard title="Ranking de mensajeros" description="Por servicios finalizados — top 14" className="mb-5">
        {stats.length ? (
          <RankingBarList items={stats.slice(0, 14).map((s) => ({ key: s.nombreTrabajador, count: s.finalizado }))} />
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin mensajeros asignados para este filtro.</p>
        )}
      </ChartCard>

      <ChartCard title="Detalle por mensajero" description="Total gestionado y desglose por estado">
        {stats.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-xs">
              <thead>
                <tr>
                  {['Mensajero', 'Identificación', 'Total', 'Finalizado', 'Cancelado', 'En proceso'].map((h) => (
                    <th
                      key={h}
                      className="border-b border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.identTrabajador} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]">
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[var(--text)]">{s.nombreTrabajador}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{s.identTrabajador}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[var(--text-secondary)]">{s.total.toLocaleString('es-CO')}</td>
                    <td className="px-3 py-2.5 tabular-nums font-semibold" style={{ color: STATUS_COLOR['Finalizado'] }}>
                      {s.finalizado.toLocaleString('es-CO')}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums font-semibold" style={{ color: STATUS_COLOR['Cancelado'] }}>
                      {s.cancelado.toLocaleString('es-CO')}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums font-semibold" style={{ color: EN_PROCESO_COLOR }}>
                      {s.enProceso.toLocaleString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin mensajeros asignados para este filtro.</p>
        )}
      </ChartCard>
    </div>
  );
}
