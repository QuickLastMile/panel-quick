'use client';

import { DollarSign, XCircle, AlertOctagon, Percent } from 'lucide-react';
import type { CancelacionData } from '@/lib/cancelacion-aggregate';
import StatCard from '@/components/stat-card';
import ChartCard from '@/components/charts/chart-card';
import BarTrendChart from '@/components/charts/bar-trend-chart';
import RankingBarList from '@/components/charts/ranking-bar-list';

function money(v: number): string {
  return `$${Math.round(v).toLocaleString('es-CO')}`;
}

export default function CancelacionesClient({ data }: { data: CancelacionData }) {
  const pctQueCuentan = data.totalCancelaciones ? Math.round((data.totalQueCuentan / data.totalCancelaciones) * 1000) / 10 : 0;

  const mesPoints = data.porMes.map((m) => ({ label: m.mesLabel, value: m.valor }));
  const diaPoints = data.porDia.map((d) => ({ label: d.fechaLabel, value: d.valor }));

  const motivoCuentanItems = data.porMotivo.filter((m) => m.cuenta).map((m) => ({ key: m.motivo, count: m.valor }));
  const motivoTodosItems = data.porMotivo.map((m) => ({ key: `${m.motivo}${m.cuenta ? '' : ' (no cuenta)'}`, count: m.count }));
  const proyectoItems = data.porProyecto.map((p) => ({ key: p.key, count: p.valor }));
  const jefaturaItems = data.porJefatura.map((j) => ({ key: j.key, count: j.valor }));
  const vehiculoItems = data.porVehiculo.map((v) => ({ key: v.key, count: v.valor }));
  const gestorItems = data.porGestor.map((g) => ({ key: g.key, count: g.count }));

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Venta perdida"
          value={money(data.valorPerdido)}
          icon={DollarSign}
          iconColor="#e2574c"
          sub="Suma de Precio Total — solo motivos marcados como pérdida"
        />
        <StatCard
          label="Cancelaciones venta perdida"
          value={data.totalQueCuentan.toLocaleString('es-CO')}
          icon={AlertOctagon}
          iconColor="#e2574c"
          sub={`${pctQueCuentan}% del total de cancelaciones`}
        />
        <StatCard label="Cancelaciones totales" value={data.totalCancelaciones.toLocaleString('es-CO')} icon={XCircle} iconColor="#8a8a8a" />
        <StatCard
          label="Motivos clasificados"
          value={`${data.porMotivo.filter((m) => m.cuenta).length}/${data.porMotivo.length}`}
          icon={Percent}
          iconColor="#f3c94f"
          sub="Configurable en Configuración → Base de cruce"
        />
      </div>

      <ChartCard
        title="Venta perdida por mes"
        description="Suma de Precio Total de cancelaciones cuyo motivo cuenta como pérdida."
        className="mb-5"
      >
        <BarTrendChart points={mesPoints} valueFormatter={money} emptyMessage="Sin cancelaciones que cuenten como pérdida todavía." />
      </ChartCard>

      <ChartCard
        title="Venta perdida por día"
        description="Mismo criterio, desglosado por día."
        className="mb-5"
      >
        <BarTrendChart points={diaPoints} valueFormatter={money} emptyMessage="Sin cancelaciones que cuenten como pérdida todavía." />
      </ChartCard>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Venta perdida por tipo de cancelación" description="Solo motivos marcados como pérdida.">
          {motivoCuentanItems.length ? (
            <RankingBarList items={motivoCuentanItems} formatValue={money} color="#e2574c" />
          ) : (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              Ningún motivo está marcado como pérdida todavía — ve a Configuración → Base de cruce → Tipos de cancelación.
            </p>
          )}
        </ChartCard>
        <ChartCard title="Venta perdida por vehículo" description="Solo motivos marcados como pérdida.">
          {vehiculoItems.length ? (
            <RankingBarList items={vehiculoItems} formatValue={money} color="#e2574c" />
          ) : (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin datos para este filtro.</p>
          )}
        </ChartCard>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Cantidad de cancelaciones por tipo" description="Todos los motivos — se marca cuál no cuenta como pérdida.">
          <RankingBarList items={motivoTodosItems} />
        </ChartCard>
        <ChartCard title="Cantidad de cancelaciones por gestor" description="Todas las canceladas, asignadas por ese gestor — top 15.">
          {gestorItems.length ? (
            <RankingBarList items={gestorItems} />
          ) : (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin datos para este filtro.</p>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard title="Proyectos que más pérdida generan" description="Suma de Precio Total — solo motivos que cuentan como pérdida.">
          {proyectoItems.length ? (
            <RankingBarList items={proyectoItems} formatValue={money} />
          ) : (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin datos para este filtro.</p>
          )}
        </ChartCard>
        <ChartCard title="Jefaturas que más pérdida generan" description="Suma de Precio Total — solo motivos que cuentan como pérdida.">
          {jefaturaItems.length ? (
            <RankingBarList items={jefaturaItems} formatValue={money} />
          ) : (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin datos para este filtro.</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
