import { getServiceRows } from '@/lib/sheets';
import { buildDashboardData } from '@/lib/aggregate';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import GestionClient from './gestion-client';

export default async function GestionPage() {
  await requireRole(['admin', 'supervisor']);
  const rows = await getServiceRows();
  const data = buildDashboardData(rows);
  const asOf = new Date(data.generadoEn).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div>
      <PageHeader eyebrow="Gestión" title="Operación por" accent="estado del servicio" asOf={asOf} />
      <GestionClient gestion={data.gestion} />
    </div>
  );
}
