import { getSheetsSnapshot } from '@/lib/sheets';
import { isSinClasificar } from '@/lib/aggregate';
import { parseDateFilterParams, filterRowsByDate, formatDateFilterLabel, isToday, formatBogotaDateTime } from '@/lib/date-filter';
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
  // Excluye "OTRO"/"OTROS"/"NN" — son proyectos sin clasificar, no reales.
  const rows = filterRowsByDate(allRows, filter).filter((r) => !isSinClasificar(r.proyecto));
  const syncLabel = lastSyncedAt ? formatBogotaDateTime(lastSyncedAt) : 'sin sincronizar aún';

  return (
    <div>
      <PageHeader
        eyebrow="Gestión"
        title="Operación por"
        accent={`estado — ${isToday(filter) ? 'hoy' : formatDateFilterLabel(filter)}`}
        asOf={`Última sincronización: ${syncLabel}`}
      />
      <DateFilterBar filter={filter} />
      <GestionClient rows={rows} />
    </div>
  );
}
