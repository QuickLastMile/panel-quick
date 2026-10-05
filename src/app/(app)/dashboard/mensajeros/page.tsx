import { getSheetsSnapshot } from '@/lib/sheets';
import { isSinClasificar, buildMensajeroStats } from '@/lib/aggregate';
import { formatBogotaDateTime } from '@/lib/date-filter';
import { getDirectorio } from '@/lib/directorio';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import MensajerosClient from './mensajeros-client';

export default async function MensajerosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const role = await requireRole(['admin', 'supervisor']);
  const sp = await searchParams;
  const proyectoParam = typeof sp.proyecto === 'string' ? sp.proyecto : '';

  const { rows: allRows, lastSyncedAt } = await getSheetsSnapshot();
  const cleanRows = allRows.filter((r) => !isSinClasificar(r.proyecto));
  const directorio = await getDirectorio();
  const syncLabel = lastSyncedAt ? formatBogotaDateTime(lastSyncedAt) : 'sin sincronizar aún';

  // El cálculo en sí es barato (milisegundos para todo el histórico) — lo
  // caro era mandar las 28k+ filas crudas al navegador solo para que el
  // cliente las filtrara. Acá se filtra y se agrega en el servidor, y solo
  // viaja el resultado (un puñado de mensajeros), igual que el filtro de
  // proyecto se resuelve por URL en vez de estado local.
  const proyectos = Array.from(new Set(cleanRows.map((r) => r.proyecto).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es'));
  const filteredRows = proyectoParam ? cleanRows.filter((r) => r.proyecto === proyectoParam) : cleanRows;
  const stats = buildMensajeroStats(filteredRows);

  return (
    <div>
      <PageHeader
        eyebrow="Mensajeros"
        title="Ranking de"
        accent="mensajeros — histórico completo"
        asOf={`Última sincronización: ${syncLabel}`}
      />
      <MensajerosClient
        stats={stats}
        proyectos={proyectos}
        proyectoParam={proyectoParam}
        directorio={directorio}
        canEditDirectorio={role === 'admin'}
      />
    </div>
  );
}
