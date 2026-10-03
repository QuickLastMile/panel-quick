import { Package, Clock, UserCheck, Truck, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { getSheetsSnapshot } from '@/lib/sheets';
import { buildDashboardData, buildTrendData, listJefaturas, filterRowsByJefatura } from '@/lib/aggregate';
import { parseDateFilterParams, filterRowsByDate, formatDateFilterLabel, isToday, formatBogotaDateTime } from '@/lib/date-filter';
import { STATUS_COLOR } from '@/lib/status-colors';
import PageHeader from '@/components/page-header';
import DateFilterBar from '@/components/date-filter';
import JefaturaTabs from '@/components/jefatura-tabs';
import StatCard from '@/components/stat-card';
import ChartCard from '@/components/charts/chart-card';
import StackedBarList from '@/components/charts/stacked-bar-list';
import RankingBarList from '@/components/charts/ranking-bar-list';
import FranjaChart from '@/components/charts/franja-chart';
import MesChart from '@/components/charts/mes-chart';
import DiaTrendChart from '@/components/charts/dia-trend-chart';

const STATUS_ICON = {
  'En Espera': Clock,
  'Asignado': UserCheck,
  'En Tránsito': Truck,
  'Relanzado': RotateCcw,
  'Finalizado': CheckCircle2,
  'Cancelado': XCircle,
} as const;

export default async function ResumenPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filter = parseDateFilterParams(sp);
  const jefaturaParam = typeof sp.jefatura === 'string' ? sp.jefatura : '';

  const { rows: allRows, lastSyncedAt } = await getSheetsSnapshot();
  const jefaturas = listJefaturas(allRows);

  const jefaturaRows = filterRowsByJefatura(allRows, jefaturaParam);
  const rows = filterRowsByDate(jefaturaRows, filter);
  const data = buildDashboardData(rows);
  // Mes y tendencia por día se calculan sobre el histórico completo (solo
  // acotado por jefatura), a propósito desacoplados del filtro de día/mes de
  // la página — cada uno trae su propio filtro de proyecto/mes.
  const trend = buildTrendData(jefaturaRows);

  const byEstado = Object.fromEntries(data.porEstado.map((e) => [e.key, e.count]));
  const syncLabel = lastSyncedAt ? formatBogotaDateTime(lastSyncedAt) : 'sin sincronizar aún';

  return (
    <div>
      <PageHeader
        eyebrow="Resumen operativo"
        title="Servicios de"
        accent={`solicitud — ${isToday(filter) ? 'hoy' : formatDateFilterLabel(filter)}`}
        asOf={`Última sincronización: ${syncLabel} · ${data.totalServicios.toLocaleString('es-CO')} servicios`}
      />

      <JefaturaTabs jefaturas={jefaturas} selected={jefaturaParam} />
      <DateFilterBar filter={filter} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Total servicios" value={data.totalServicios.toLocaleString('es-CO')} icon={Package} iconColor="#f3c94f" />
        {(Object.keys(STATUS_ICON) as (keyof typeof STATUS_ICON)[]).map((st) => (
          <StatCard
            key={st}
            label={st}
            value={(byEstado[st] || 0).toLocaleString('es-CO')}
            icon={STATUS_ICON[st]}
            iconColor={STATUS_COLOR[st]}
          />
        ))}
      </div>

      <ChartCard
        title="Servicios por proyecto y estado"
        description='Acumulado por proyecto solicitante — fecha de solicitud. Top 14 por volumen, o enfoca uno (excluye "OTRO"/"NN").'
        className="mb-5"
      >
        {data.porProyecto.length ? (
          <StackedBarList totals={data.porProyecto} byKey={data.proyectoEstado} selectable selectPlaceholder="Top 14 proyectos" />
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin servicios para esta fecha.</p>
        )}
      </ChartCard>

      <ChartCard
        title="Servicios por franja horaria"
        description="Tendencia por hora del día — servicio o solicitud. Solo muestra el rango de horas con datos."
        className="mb-5"
      >
        <FranjaChart horaCiudad={data.horaCiudad} ciudades={data.porCiudad.map((c) => c.key)} />
      </ChartCard>

      <ChartCard title="Servicios por ciudad" description="Top 14 ciudades — desglose por estado" className="mb-5">
        {data.porCiudad.length ? (
          <StackedBarList totals={data.porCiudad} byKey={data.ciudadEstado.map((c) => ({ proyecto: c.ciudad, estado: c.estado, count: c.count }))} />
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin servicios para esta fecha.</p>
        )}
      </ChartCard>

      <div className="mb-5 grid gap-5 md:grid-cols-2">
        <ChartCard title="Servicios por tipo de jornada" description='Columna "Servicio" — Vuelta / Día / Medio día'>
          {data.porServicio.length ? (
            <RankingBarList items={data.porServicio} />
          ) : (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin servicios para esta fecha.</p>
          )}
        </ChartCard>
        <ChartCard title="Servicios por tipo de vehículo" description='Columna "Tipo de Servicio" — Domicilio / Mensajería / Carry'>
          {data.porTipoServicio.length ? (
            <RankingBarList items={data.porTipoServicio} />
          ) : (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin servicios para esta fecha.</p>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Servicios por mes"
        description="Histórico completo, independiente del filtro de día — filtra por proyecto desde aquí"
        className="mb-5"
      >
        <MesChart mesProyecto={trend.mesProyecto} />
      </ChartCard>

      <ChartCard
        title="Tendencia por día"
        description="Una línea por estado. Histórico completo, independiente del filtro de día — filtra por mes y proyecto desde aquí"
      >
        <DiaTrendChart diaProyecto={trend.diaProyecto} />
      </ChartCard>
    </div>
  );
}
