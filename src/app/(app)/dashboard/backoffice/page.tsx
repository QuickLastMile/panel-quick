import { listCargas, getCarga } from '@/lib/backoffice';
import { requireRole, getSession } from '@/lib/session';
import PageHeader from '@/components/page-header';
import BackofficeClient from './backoffice-client';

export default async function BackofficePage({ searchParams }: { searchParams: Promise<{ carga?: string }> }) {
  const role = await requireRole(['admin', 'supervisor', 'onboarding']);
  const session = await getSession();
  const { carga: cargaParam } = await searchParams;

  const cargas = await listCargas();
  // Sin ?carga= se muestra la más reciente.
  const cargaId = cargaParam && cargas.some((c) => c.id === cargaParam) ? cargaParam : cargas[0]?.id;
  const carga = cargaId ? await getCarga(cargaId) : null;

  return (
    <div>
      <PageHeader
        eyebrow="BackOffice"
        title="Ajustes del"
        accent="agilizador"
        asOf={`${cargas.length.toLocaleString('es-CO')} ${cargas.length === 1 ? 'carga activa' : 'cargas activas'}`}
      />
      <BackofficeClient
        cargas={cargas}
        carga={carga}
        canUpload={role === 'admin' || role === 'onboarding'}
        isAdmin={role === 'admin'}
        currentEmail={session?.email || ''}
      />
    </div>
  );
}
