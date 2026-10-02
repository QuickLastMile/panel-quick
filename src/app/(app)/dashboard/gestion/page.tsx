import { getSheetsSnapshot } from '@/lib/sheets';
import { buildDashboardData } from '@/lib/aggregate';
import { parseDateFilterParams, filterRowsByDate, formatDateFilterLabel, isToday } from '@/lib/date-filter';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import DateFilterBar from '@/components/date-filter';
import GestionClient from './gestion-client';

export default async function GestionPage({
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
        eyebrow="Gestión"
        title="Operación por"
        accent={`estado — ${isToday(filter) ? 'hoy' : formatDateFilterLabel(filter)}`}
        asOf={`Última sincronización: ${syncLabel}`}
      />
      <DateFilterBar filter={filter} />
      <GestionClient gestion={data.gestion} />
    </div>
  );
}
