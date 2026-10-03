'use client';

import { useMemo, useState } from 'react';
import type { ServiceRow } from '@/lib/sheets';
import type { GestorStat } from '@/lib/aggregate';
import type { SimpleDate } from '@/lib/date-filter';
import { STATUS_COLOR } from '@/lib/status-colors';
import ChartCard from '@/components/charts/chart-card';
import RankingBarList from '@/components/charts/ranking-bar-list';
import GestorDetailPanel from '@/components/gestor-detail-panel';

const EN_PROCESO_COLOR = STATUS_COLOR['Asignado'];

export default function GestoresClient({
  gestorStats,
  allRows,
  defaultDay,
}: {
  gestorStats: GestorStat[];
  allRows: ServiceRow[];
  defaultDay: SimpleDate;
}) {
  const [fGestor, setFGestor] = useState('');
  const [openGestor, setOpenGestor] = useState<string | null>(null);

  const gestores = useMemo(() => gestorStats.map((g) => g.gestor).sort((a, b) => a.localeCompare(b, 'es')), [gestorStats]);

  const filteredStats = useMemo(
    () => (fGestor ? gestorStats.filter((g) => g.gestor === fGestor) : gestorStats),
    [gestorStats, fGestor]
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-2.5">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Gestor</span>
          <select
            value={fGestor}
            onChange={(e) => setFGestor(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
          >
            <option value="">Todos</option>
            {gestores.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        {fGestor && (
          <button onClick={() => setFGestor('')} className="text-xs font-semibold text-[var(--accent-bright)] hover:underline">
            Limpiar filtro
          </button>
        )}
      </div>

      <ChartCard
        title="Servicios por gestor"
        description='Volumen total gestionado — todos los estados (excluye "OTRO"/"OTROS"/"NN")'
        className="mb-5"
      >
        {filteredStats.length ? (
          <RankingBarList items={filteredStats.map((g) => ({ key: g.gestor, count: g.total }))} />
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin servicios para esta fecha.</p>
        )}
      </ChartCard>

      <ChartCard title="Productividad por gestor" description="% cumplimiento = finalizados / total de servicios del gestor. Clic en un gestor para ver su detalle.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-xs">
            <thead>
              <tr>
                {['Gestor', 'Cargo', 'Total', 'Finalizado', 'Cancelado', 'En proceso', 'Cumplimiento'].map((h) => (
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
              {filteredStats.map((g) => (
                <tr
                  key={g.gestor}
                  onClick={() => setOpenGestor(g.gestor)}
                  className="cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[var(--text)]">{g.gestor}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{g.cargo || '—'}</td>
                  <td className="px-3 py-2.5 tabular-nums text-[var(--text-secondary)]">{g.total.toLocaleString('es-CO')}</td>
                  <td className="px-3 py-2.5 tabular-nums font-semibold" style={{ color: STATUS_COLOR['Finalizado'] }}>
                    {g.finalizado.toLocaleString('es-CO')}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums font-semibold" style={{ color: STATUS_COLOR['Cancelado'] }}>
                    {g.cancelado.toLocaleString('es-CO')}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums font-semibold" style={{ color: EN_PROCESO_COLOR }}>
                    {g.enProceso.toLocaleString('es-CO')}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                        <div
                          className="h-full animate-grow-width rounded-full bg-gradient-gold"
                          style={{ width: `${Math.min(g.cumplimientoPct, 100)}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-[var(--text-secondary)]">{g.cumplimientoPct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <GestorDetailPanel gestor={openGestor} allRows={allRows} defaultDay={defaultDay} onClose={() => setOpenGestor(null)} />
    </div>
  );
}
