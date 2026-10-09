import { getSheetsSnapshot } from '@/lib/sheets';
import { buildDashboardData, buildTipoAsignadorTrend, buildDiaSemanaStats, isSinClasificar } from '@/lib/aggregate';
import { parseDateFilterParams, filterRowsByDate, formatDateFilterLabel, isToday, formatBogotaDateTime } from '@/lib/date-filter';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import DateFilterBar from '@/components/date-filter';
import GestoresClient from './gestores-client';

export default async function GestoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(['admin', 'supervisor']);
  const filter = parseDateFilterParams(await searchParams);
  const { rows: allRows, lastSyncedAt } = await getSheetsSnapshot();
  const cleanRows = allRows.filter((r) => !isSinClasificar(r.proyecto));
  const rows = filterRowsByDate(cleanRows, filter);
  const data = buildDashboardData(rows);
  // Histórico completo (no el filtro de día de la página) — para ver la
  // tendencia real de quién asigna a través del tiempo.
  const asignadorTrend = buildTipoAsignadorTrend(cleanRows);
  const diaSemana = buildDiaSemanaStats(cleanRows);
  const syncLabel = lastSyncedAt ? formatBogotaDateTime(lastSyncedAt) : 'sin sincronizar aún';

  return (
    <div>
      <PageHeader
        eyebrow="Seguimiento"
        title="Productividad por"
        accent={`gestor — ${isToday(filter) ? 'hoy' : formatDateFilterLabel(filter)}`}
        asOf={`Última sincronización: ${syncLabel}`}
      />
      <DateFilterBar filter={filter} />
      <GestoresClient
        gestorStats={data.gestorStats}
        porTipoAsignador={data.porTipoAsignador}
        asignadorTrend={asignadorTrend}
        diaSemana={diaSemana}
        allRows={cleanRows}
        defaultDay={{ year: filter.year, month: filter.month, day: filter.day }}
      />
    </div>
  );
}
