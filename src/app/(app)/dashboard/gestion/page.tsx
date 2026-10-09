import { getSheetsSnapshot } from '@/lib/sheets';
import { isSinClasificar, buildTrendData } from '@/lib/aggregate';
import { parseDateFilterParams, filterRowsByDate, formatDateFilterLabel, isToday, formatBogotaDateTime } from '@/lib/date-filter';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import DateFilterBar from '@/components/date-filter';
import ChartCard from '@/components/charts/chart-card';
import DiaTrendChart from '@/components/charts/dia-trend-chart';
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
  const cleanRows = allRows.filter((r) => !isSinClasificar(r.proyecto));
  const rows = filterRowsByDate(cleanRows, filter);
  // Histórico completo, independiente del filtro de día de la página —
  // mismo patrón que en Resumen, con su propio filtro de mes/proyecto.
  const trend = buildTrendData(cleanRows);
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

      <ChartCard
        title="Tendencia por día"
        description="Total de servicios por día (con el estado al pasar el mouse). Histórico completo — filtra por mes y proyecto desde aquí."
        className="mb-5"
      >
        <DiaTrendChart diaProyecto={trend.diaProyecto} defaultMode="total" />
      </ChartCard>

      <GestionClient rows={rows} />
    </div>
  );
}
