import { getSheetsSnapshot } from '@/lib/sheets';
import {
  buildMensajeroStats,
  listJefaturas,
  filterRowsByJefatura,
  listProyectos,
  filterRowsByProyecto,
  parseProyectoParam,
  isSinClasificar,
} from '@/lib/aggregate';
import { parseDateFilterParams, filterRowsByDate, formatDateFilterLabel, formatBogotaDateTime } from '@/lib/date-filter';
import { getDirectorio } from '@/lib/directorio';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import DateFilterBar from '@/components/date-filter';
import JefaturaTabs from '@/components/jefatura-tabs';
import ProyectoFilter from '@/components/proyecto-filter';
import MensajerosClient from './mensajeros-client';

// Ver dashboard/page.tsx: getSheetsSnapshot() puede tardar 25-30s con la
// tabla actual — sin esto, Vercel corta la función y la página queda vacía.
export const maxDuration = 60;

export default async function MensajerosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(['admin', 'supervisor']);
  const sp = await searchParams;

  // Esta página arranca en modo "mes actual" (a diferencia del resto del
  // panel, que arranca en "día actual") — el gerente quiere ver el
  // acumulado del mes, no un solo día, al entrar. Si la URL ya trae `mode`
  // (el usuario cambió el filtro), se respeta eso.
  const spConFiltroDefault = sp.mode ? sp : { ...sp, mode: 'month' };
  const filter = parseDateFilterParams(spConFiltroDefault);
  const jefaturaParam = typeof sp.jefatura === 'string' ? sp.jefatura : '';
  const proyectoParam = parseProyectoParam(sp);

  const { rows: allRows, lastSyncedAt } = await getSheetsSnapshot();
  const cleanRows = allRows.filter((r) => !isSinClasificar(r.proyecto));
  const directorio = await getDirectorio();
  const syncLabel = lastSyncedAt ? formatBogotaDateTime(lastSyncedAt) : 'sin sincronizar aún';

  const jefaturas = listJefaturas(cleanRows);
  const proyectos = listProyectos(cleanRows);

  const scopedRows = filterRowsByProyecto(filterRowsByJefatura(cleanRows, jefaturaParam), proyectoParam);
  const filteredRows = filterRowsByDate(scopedRows, filter);
  const stats = buildMensajeroStats(filteredRows);

  return (
    <div>
      <PageHeader
        eyebrow="Mensajeros"
        title="Ranking de"
        accent={`mensajeros — ${formatDateFilterLabel(filter)}`}
        asOf={`Última sincronización: ${syncLabel}`}
      />

      <JefaturaTabs jefaturas={jefaturas} selected={jefaturaParam} />
      <ProyectoFilter proyectos={proyectos} selected={proyectoParam} />
      <DateFilterBar filter={filter} />

      <MensajerosClient stats={stats} directorio={directorio} />
    </div>
  );
}
