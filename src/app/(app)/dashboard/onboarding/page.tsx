import { Users, CalendarCheck, TrendingUp, MapPin } from 'lucide-react';
import { getOnboardingSnapshot } from '@/lib/onboarding';
import { buildOnboardingData, buildOnboardingKpis } from '@/lib/onboarding-aggregate';
import { parseDateFilterParams, filterRowsByDateField, formatDateFilterLabel, isToday, bogotaToday } from '@/lib/date-filter';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import DateFilterBar from '@/components/date-filter';
import StatCard from '@/components/stat-card';
import ChartCard from '@/components/charts/chart-card';
import RankingBarList from '@/components/charts/ranking-bar-list';
import BarTrendChart from '@/components/charts/bar-trend-chart';
import TrendLineChart from '@/components/charts/trend-line-chart';
import VinculadosTable from './vinculados-table';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(['admin', 'supervisor']);
  const filter = parseDateFilterParams(await searchParams);
  const { rows: allRows } = await getOnboardingSnapshot();

  const rows = filterRowsByDateField(allRows, filter, (r) => r.fechaVinculacion);
  const data = buildOnboardingData(rows);
  // Histórico completo, independiente del filtro de día — mismo patrón que
  // "Servicios por mes" / "Tendencia por día" en el resto del panel.
  const historico = buildOnboardingData(allRows);
  const kpis = buildOnboardingKpis(allRows, bogotaToday());

  const mesPoints = historico.mesVinculacion.map((m) => ({ label: m.mesLabel, value: m.count }));
  const diaPoints = historico.diaVinculacion.map((d) => ({ label: d.fechaLabel, value: d.count }));

  return (
    <div>
      <PageHeader
        eyebrow="Onboarding"
        title="Vinculaciones de"
        accent={`mensajeros — ${isToday(filter) ? 'hoy' : formatDateFilterLabel(filter)}`}
        asOf={`${allRows.length.toLocaleString('es-CO')} vinculados en total`}
      />

      <DateFilterBar filter={filter} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Vinculados" value={data.total.toLocaleString('es-CO')} icon={Users} iconColor="#f3c94f" sub={isToday(filter) ? undefined : formatDateFilterLabel(filter)} />
        <StatCard label="Vinculados hoy" value={kpis.vinculadosHoy.toLocaleString('es-CO')} icon={CalendarCheck} iconColor="#4f9df5" />
        <StatCard label="Promedio por día" value={kpis.promedioPorDia.toLocaleString('es-CO', { maximumFractionDigits: 1 })} icon={TrendingUp} iconColor="#8a8a8a" sub="Histórico completo" />
        <StatCard label="Ciudad top" value={kpis.ciudadTop?.key || '—'} icon={MapPin} iconColor="#e2574c" sub={kpis.ciudadTop ? `${kpis.ciudadTop.count.toLocaleString('es-CO')} vinculados` : undefined} />
      </div>

      <ChartCard
        title="Vinculaciones por supervisor"
        description={`Columna "AGILIZADOR" — quién hizo la vinculación. Usa el filtro de fecha de arriba (${isToday(filter) ? 'hoy' : formatDateFilterLabel(filter)}).`}
        className="mb-5"
      >
        {data.porAgilizador.length ? (
          <RankingBarList items={data.porAgilizador} showPercent />
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin vinculaciones para esta fecha.</p>
        )}
      </ChartCard>

      <ChartCard title="Vinculaciones por ciudad" className="mb-5">
        {data.porCiudad.length ? (
          <RankingBarList items={data.porCiudad} showPercent />
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin vinculaciones para esta fecha.</p>
        )}
      </ChartCard>

      <ChartCard title="Vinculaciones por vehículo" className="mb-5">
        {data.porVehiculo.length ? (
          <RankingBarList items={data.porVehiculo} showPercent />
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin vinculaciones para esta fecha.</p>
        )}
      </ChartCard>

      <ChartCard title="Vinculaciones por mes" description='Columna "FECHA VINCULACION" — histórico completo, independiente del filtro de arriba.' className="mb-5">
        {mesPoints.length ? (
          <BarTrendChart points={mesPoints} />
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin vinculaciones registradas.</p>
        )}
      </ChartCard>

      <ChartCard title="Vinculaciones por día" description='Columna "FECHA VINCULACION" — histórico completo, independiente del filtro de arriba.' className="mb-5">
        {diaPoints.length ? (
          <TrendLineChart points={diaPoints} />
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin vinculaciones registradas.</p>
        )}
      </ChartCard>

      <VinculadosTable rows={rows} />
    </div>
  );
}
