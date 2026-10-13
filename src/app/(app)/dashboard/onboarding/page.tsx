import { Users } from 'lucide-react';
import { getOnboardingSnapshot } from '@/lib/onboarding';
import { buildOnboardingData } from '@/lib/onboarding-aggregate';
import { requireRole } from '@/lib/session';
import PageHeader from '@/components/page-header';
import StatCard from '@/components/stat-card';
import ChartCard from '@/components/charts/chart-card';
import RankingBarList from '@/components/charts/ranking-bar-list';
import BarTrendChart from '@/components/charts/bar-trend-chart';
import TrendLineChart from '@/components/charts/trend-line-chart';
import VinculadosTable from './vinculados-table';

export default async function OnboardingPage() {
  await requireRole(['admin', 'supervisor']);
  const { rows } = await getOnboardingSnapshot();
  const data = buildOnboardingData(rows);

  const mesPoints = data.mesVinculacion.map((m) => ({ label: m.mesLabel, value: m.count }));
  const diaPoints = data.diaVinculacion.map((d) => ({ label: d.fechaLabel, value: d.count }));

  return (
    <div>
      <PageHeader
        eyebrow="Onboarding"
        title="Vinculaciones de"
        accent="mensajeros"
        asOf={`${data.total.toLocaleString('es-CO')} vinculados en total`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total vinculados" value={data.total.toLocaleString('es-CO')} icon={Users} iconColor="#f3c94f" />
      </div>

      <ChartCard
        title="Vinculaciones por supervisor"
        description='Columna "AGILIZADOR" — quién hizo la vinculación.'
        className="mb-5"
      >
        {data.porAgilizador.length ? (
          <RankingBarList items={data.porAgilizador} showPercent />
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin vinculaciones registradas.</p>
        )}
      </ChartCard>

      <div className="mb-5 grid gap-5 md:grid-cols-2">
        <ChartCard title="Vinculaciones por ciudad">
          {data.porCiudad.length ? (
            <RankingBarList items={data.porCiudad} showPercent />
          ) : (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin vinculaciones registradas.</p>
          )}
        </ChartCard>
        <ChartCard title="Vinculaciones por vehículo">
          {data.porVehiculo.length ? (
            <RankingBarList items={data.porVehiculo} showPercent />
          ) : (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin vinculaciones registradas.</p>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Vinculaciones por mes" description='Columna "FECHA VINCULACION"' className="mb-5">
        {mesPoints.length ? (
          <BarTrendChart points={mesPoints} />
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin vinculaciones registradas.</p>
        )}
      </ChartCard>

      <ChartCard title="Vinculaciones por día" description='Columna "FECHA VINCULACION"' className="mb-5">
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
