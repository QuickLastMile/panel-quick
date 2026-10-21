import { getSheetsSnapshot } from '@/lib/sheets';
import { getMotivosCancelacionConfig } from '@/lib/motivos-cancelacion';
import { buildCancelacionData } from '@/lib/cancelacion-aggregate';
import { requireRole } from '@/lib/session';
import { formatBogotaDateTime } from '@/lib/date-filter';
import PageHeader from '@/components/page-header';
import CancelacionesClient from './cancelaciones-client';

// Ver dashboard/page.tsx: getSheetsSnapshot() puede tardar 25-30s con la
// tabla actual — sin esto, Vercel corta la función y la página queda vacía.
export const maxDuration = 60;

export default async function CancelacionesPage() {
  await requireRole(['admin', 'supervisor']);

  const [{ rows, lastSyncedAt }, motivosConfig] = await Promise.all([getSheetsSnapshot(), getMotivosCancelacionConfig()]);

  const motivosCuentan = new Set(motivosConfig.filter((m) => m.cuentaEnPerdida).map((m) => m.motivo));
  const data = buildCancelacionData(rows, motivosCuentan);
  const syncLabel = lastSyncedAt ? formatBogotaDateTime(lastSyncedAt) : 'sin sincronizar aún';

  return (
    <div>
      <PageHeader
        eyebrow="Cancelación"
        title="Resumen de"
        accent="cancelaciones"
        asOf={`Última sincronización: ${syncLabel} · histórico completo`}
      />
      <CancelacionesClient data={data} />
    </div>
  );
}
