import { getSheetsSnapshot } from '@/lib/sheets';
import { getMotivosCancelacionConfig } from '@/lib/motivos-cancelacion';
import { buildCancelacionData, buildPorDiaDelMes } from '@/lib/cancelacion-aggregate';
import { listJefaturas, filterRowsByJefatura, listProyectos, filterRowsByProyecto, parseProyectoParam } from '@/lib/aggregate';
import { requireRole } from '@/lib/session';
import { parseDateFilterParams, filterRowsByDate, formatDateFilterLabel, isToday, formatBogotaDateTime } from '@/lib/date-filter';
import PageHeader from '@/components/page-header';
import DateFilterBar from '@/components/date-filter';
import JefaturaTabs from '@/components/jefatura-tabs';
import ProyectoFilter from '@/components/proyecto-filter';
import CancelacionesClient from './cancelaciones-client';

// Ver dashboard/page.tsx: getSheetsSnapshot() puede tardar 25-30s con la
// tabla actual — sin esto, Vercel corta la función y la página queda vacía.
export const maxDuration = 60;

export default async function CancelacionesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(['admin', 'supervisor']);

  const sp = await searchParams;
  // Por defecto hoy (parseDateFilterParams ya usa bogotaToday() si no hay
  // parámetros en la URL) — a diferencia de Onboarding, esta data no tiene
  // rezago de un día.
  const filter = parseDateFilterParams(sp);
  const jefaturaParam = typeof sp.jefatura === 'string' ? sp.jefatura : '';
  const proyectoParam = parseProyectoParam(sp);

  const [{ rows: allRows, lastSyncedAt }, motivosConfig] = await Promise.all([getSheetsSnapshot(), getMotivosCancelacionConfig()]);

  const jefaturas = listJefaturas(allRows);
  const proyectos = listProyectos(allRows);

  const scopedRows = filterRowsByProyecto(filterRowsByJefatura(allRows, jefaturaParam), proyectoParam);
  const rows = filterRowsByDate(scopedRows, filter);
  // "Venta perdida por día" ignora el día/rango exacto a propósito — un
  // solo día daría una sola barra. Siempre muestra el MES del filtro
  // actual (jefatura/proyecto sí aplican).
  const mesRows = filterRowsByDate(scopedRows, { mode: 'month', year: filter.year, month: filter.month, day: 1 });

  const motivosCuentan = new Set(motivosConfig.filter((m) => m.cuentaEnPerdida).map((m) => m.motivo));
  const data = buildCancelacionData(rows, motivosCuentan);
  const porDiaMes = buildPorDiaDelMes(mesRows, motivosCuentan);
  const syncLabel = lastSyncedAt ? formatBogotaDateTime(lastSyncedAt) : 'sin sincronizar aún';

  return (
    <div>
      <PageHeader
        eyebrow="Cancelación"
        title="Resumen de"
        accent={`cancelaciones — ${isToday(filter) ? 'hoy' : formatDateFilterLabel(filter)}`}
        asOf={`Última sincronización: ${syncLabel}`}
      />

      <JefaturaTabs jefaturas={jefaturas} selected={jefaturaParam} />
      <ProyectoFilter proyectos={proyectos} selected={proyectoParam} />
      <DateFilterBar filter={filter} />

      <CancelacionesClient data={data} porDiaMes={porDiaMes} />
    </div>
  );
}
