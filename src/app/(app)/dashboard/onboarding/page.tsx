import { getOnboardingSnapshot } from '@/lib/onboarding';
import { getSheetsSnapshot } from '@/lib/sheets';
import { buildOnboardingKpis, buildAgilizadorMeta } from '@/lib/onboarding-aggregate';
import { parseDateFilterParams, filterRowsByDateField, formatDateFilterLabel, isToday, bogotaToday } from '@/lib/date-filter';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import DateFilterBar from '@/components/date-filter';
import OnboardingClient from './onboarding-client';

// Agilizador al que se le hace seguimiento puntual de meta (5/día, 150/mes).
const AGILIZADOR_SEGUIMIENTO = 'ZAMIR ANDRES ARCIA';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(['admin', 'supervisor']);
  const filter = parseDateFilterParams(await searchParams);

  const [{ rows: allRows }, { rows: serviceRows }] = await Promise.all([getOnboardingSnapshot(), getSheetsSnapshot()]);

  const rows = filterRowsByDateField(allRows, filter, (r) => r.fechaVinculacion);
  const today = bogotaToday();
  const kpis = buildOnboardingKpis(allRows, today);
  const zamirMeta = buildAgilizadorMeta(allRows, AGILIZADOR_SEGUIMIENTO, today);

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
        serviceRows={serviceRows}
        kpis={kpis}
        zamirMeta={zamirMeta}
        isFilteredToday={isToday(filter)}
        filterLabel={formatDateFilterLabel(filter)}
      />
    </div>
  );
}
