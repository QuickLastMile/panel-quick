import { getSheetsSnapshot } from '@/lib/sheets';
import { isSinClasificar } from '@/lib/aggregate';
import { formatBogotaDateTime } from '@/lib/date-filter';
import { getDirectorio } from '@/lib/directorio';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import MensajerosClient from './mensajeros-client';

export default async function MensajerosPage() {
  const role = await requireRole(['admin', 'supervisor']);
  const { rows: allRows, lastSyncedAt } = await getSheetsSnapshot();
  const cleanRows = allRows.filter((r) => !isSinClasificar(r.proyecto));
  const directorio = await getDirectorio();
  const syncLabel = lastSyncedAt ? formatBogotaDateTime(lastSyncedAt) : 'sin sincronizar aún';

  return (
    <div>
      <PageHeader
        eyebrow="Mensajeros"
        title="Ranking de"
        accent="mensajeros — histórico completo"
        asOf={`Última sincronización: ${syncLabel}`}
      />
      <MensajerosClient rows={cleanRows} directorio={directorio} canEditDirectorio={role === 'admin'} />
    </div>
  );
}
