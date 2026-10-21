import { getOnboardingSnapshot } from '@/lib/onboarding';
import { buildOnboardingKpis } from '@/lib/onboarding-aggregate';
import { parseDateFilterParams, filterRowsByDateField, formatDateFilterLabel, isToday } from '@/lib/date-filter';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import DateFilterBar from '@/components/date-filter';
import OnboardingClient from './onboarding-client';

// Agilizador al que se le hace seguimiento puntual de meta (5/día, 130/mes).
const AGILIZADOR_SEGUIMIENTO = 'ZAMIR ANDRES ARCIA';

// El panel de detalle de un vinculado llama getServiciosDeVinculado()
// (actions.ts), que usa getSheetsSnapshot() — puede tardar 25-30s con la
// tabla actual. Sin esto, Vercel corta la acción a medias.
export const maxDuration = 60;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(['admin', 'supervisor', 'onboarding']);
  // Arranca en el día de HOY — ahora los datos de Onboarding vienen de la
  // misma base en vivo que Vinculación, no hay rezago de un día como
  // cuando se leía del Sheet.
  const filter = parseDateFilterParams(await searchParams);

  const { rows: allRows } = await getOnboardingSnapshot();

  const rows = filterRowsByDateField(allRows, filter, (r) => r.fechaVinculacion);
  // "Vinculados [día]" usa el día/mes que esté seleccionado en el filtro de
  // arriba (no siempre el día calendario real) — si filtras a un día de
  // hace un mes, el KPI debe reflejar ESE día.
  const referenceDay = { year: filter.year, month: filter.month, day: filter.day };
  const kpis = buildOnboardingKpis(allRows, referenceDay);

  return (
    <div>
      <PageHeader
        eyebrow="Onboarding"
        title="Vinculaciones de"
        accent={`mensajeros — ${isToday(filter) ? 'hoy' : formatDateFilterLabel(filter)}`}
        asOf={`${allRows.length.toLocaleString('es-CO')} vinculados en total`}
      />

      <DateFilterBar filter={filter} />

      <OnboardingClient
        rows={rows}
        allRows={allRows}
        kpis={kpis}
        agilizadorSeguimiento={AGILIZADOR_SEGUIMIENTO}
        isFilteredToday={isToday(filter)}
        filterLabel={formatDateFilterLabel(filter)}
      />
    </div>
  );
}
