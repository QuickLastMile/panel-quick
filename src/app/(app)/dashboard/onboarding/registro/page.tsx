import { getColaboradoresConStats } from '@/lib/colaboradores';
import { requireRole } from '@/lib/session';
import { bogotaToday, daysBetween } from '@/lib/date-filter';
import PageHeader from '@/components/page-header';
import RegistroClient from './registro-client';

function isoToParts(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m, day: d };
}

export default async function RegistroColaboradoresPage() {
  const role = await requireRole(['admin', 'supervisor', 'onboarding']);
  const base = await getColaboradoresConStats();
  const today = bogotaToday();

  // Días sin servicio: desde el último servicio si ya tuvo alguno, si no
  // desde que se vinculó — así un colaborador recién vinculado no dispara
  // la alerta de inmediato ni uno sin fecha de referencia se cuenta mal.
  const colaboradores = base.map((c) => {
    const ref = isoToParts(c.ultimoServicioDate) || isoToParts(c.fechaVinculacion);
    const diasSinServicio = ref ? daysBetween(ref, today) : null;
    return { ...c, diasSinServicio };
  });

  return (
    <div>
      <PageHeader
        eyebrow="Onboarding"
        title="Registro de"
        accent="colaboradores"
        asOf={`${colaboradores.length.toLocaleString('es-CO')} registrados en total`}
      />
      <RegistroClient colaboradores={colaboradores} canVerTodo={role !== 'onboarding'} />
    </div>
  );
}
