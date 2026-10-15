import { getOnboardingSnapshot } from '@/lib/onboarding';
import { buildOnboardingKpis, buildAgilizadorMeta } from '@/lib/onboarding-aggregate';
import { parseDateFilterParams, filterRowsByDateField, formatDateFilterLabel, formatMonthLabel, isToday, bogotaToday } from '@/lib/date-filter';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import DateFilterBar from '@/components/date-filter';
import OnboardingClient from './onboarding-client';

// Agilizador al que se le hace seguimiento puntual de meta (5/día, 130/mes).
const AGILIZADOR_SEGUIMIENTO = 'ZAMIR ANDRES ARCIA';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(['admin', 'supervisor']);
  const filter = parseDateFilterParams(await searchParams);

  const { rows: allRows } = await getOnboardingSnapshot();

  const rows = filterRowsByDateField(allRows, filter, (r) => r.fechaVinculacion);
  const today = bogotaToday();
  // "Vinculados hoy" y la meta de Zamir usan el día/mes que esté
  // seleccionado en el filtro de arriba (no siempre el día calendario real)
  // — si filtras a un día de hace un mes, "este mes" debe reflejar ESE mes.
  const referenceDay = { year: filter.year, month: filter.month, day: filter.day };
  const kpis = buildOnboardingKpis(allRows, referenceDay);
  const zamirMeta = buildAgilizadorMeta(allRows, AGILIZADOR_SEGUIMIENTO, referenceDay);
  const isReferenceMonthCurrent = referenceDay.year === today.year && referenceDay.month === today.month;
  const referenceMonthLabel = formatMonthLabel(referenceDay.year, referenceDay.month);

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
        zamirMeta={zamirMeta}
        isFilteredToday={isToday(filter)}
        filterLabel={formatDateFilterLabel(filter)}
        isReferenceMonthCurrent={isReferenceMonthCurrent}
        referenceMonthLabel={referenceMonthLabel}
      />
    </div>
  );
}
