import { getSheetsSnapshot } from '@/lib/sheets';
import { buildDashboardData } from '@/lib/aggregate';
import { parseDateFilterParams, filterRowsByDate, formatDateFilterLabel, isToday } from '@/lib/date-filter';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import DateFilterBar from '@/components/date-filter';
import RankingBarList from '@/components/charts/ranking-bar-list';

export default async function GestoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(['admin', 'supervisor']);
  const filter = parseDateFilterParams(await searchParams);
  const { rows: allRows, lastSyncedAt } = await getSheetsSnapshot();
  const rows = filterRowsByDate(allRows, filter);
  const data = buildDashboardData(rows);
  const syncLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
    : 'sin sincronizar aún';

  return (
    <div>
      <PageHeader
        eyebrow="Seguimiento"
        title="Productividad por"
        accent={`gestor — ${isToday(filter) ? 'hoy' : formatDateFilterLabel(filter)}`}
        asOf={`Última sincronización: ${syncLabel}`}
      />
      <DateFilterBar filter={filter} />

      <div className="panel-card mb-5 rounded-xl p-5">
        <h2 className="text-sm font-bold text-[var(--text)]">Servicios por gestor</h2>
        <p className="mb-4 text-xs text-[var(--text-muted)]">Volumen total gestionado — todos los estados (excluye &quot;OTRO&quot;)</p>
        {data.gestorStats.length ? (
          <RankingBarList items={data.gestorStats.map((g) => ({ key: g.gestor, count: g.total }))} />
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin servicios para esta fecha.</p>
        )}
      </div>

      <div className="panel-card rounded-xl p-5">
        <h2 className="text-sm font-bold text-[var(--text)]">Productividad por gestor</h2>
        <p className="mb-4 text-xs text-[var(--text-muted)]">% cumplimiento = finalizados / total de servicios del gestor</p>
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
              {data.gestorStats.map((g) => (
                <tr key={g.gestor} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]">
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[var(--text)]">{g.gestor}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{g.cargo || '—'}</td>
                  <td className="px-3 py-2.5 tabular-nums text-[var(--text-secondary)]">{g.total.toLocaleString('es-CO')}</td>
                  <td className="px-3 py-2.5 tabular-nums text-[var(--text-secondary)]">{g.finalizado.toLocaleString('es-CO')}</td>
                  <td className="px-3 py-2.5 tabular-nums text-[var(--text-secondary)]">{g.cancelado.toLocaleString('es-CO')}</td>
                  <td className="px-3 py-2.5 tabular-nums text-[var(--text-secondary)]">{g.enProceso.toLocaleString('es-CO')}</td>
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
      </div>
    </div>
  );
}
