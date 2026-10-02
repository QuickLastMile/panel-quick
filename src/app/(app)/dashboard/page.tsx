import { Package, Clock, UserCheck, Truck, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { getSheetsSnapshot } from '@/lib/sheets';
import { buildDashboardData } from '@/lib/aggregate';
import { parseDateFilterParams, filterRowsByDate, formatDateFilterLabel, isToday } from '@/lib/date-filter';
import { STATUS_COLOR, STATUS_SOFT_BG } from '@/lib/status-colors';
import PageHeader from '@/components/page-header';
import DateFilterBar from '@/components/date-filter';
import StatCard from '@/components/stat-card';
import StackedBarList from '@/components/charts/stacked-bar-list';
import RankingBarList from '@/components/charts/ranking-bar-list';
import FranjaChart from '@/components/charts/franja-chart';

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
  const filter = parseDateFilterParams(await searchParams);
  const { rows: allRows, lastSyncedAt } = await getSheetsSnapshot();
  const rows = filterRowsByDate(allRows, filter);
  const data = buildDashboardData(rows);
  const byEstado = Object.fromEntries(data.porEstado.map((e) => [e.key, e.count]));
  const syncLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
    : 'sin sincronizar aún';

  return (
    <div>
      <PageHeader
        eyebrow="Resumen operativo"
        title="Servicios de"
        accent={`solicitud — ${isToday(filter) ? 'hoy' : formatDateFilterLabel(filter)}`}
        asOf={`Última sincronización: ${syncLabel} · ${data.totalServicios.toLocaleString('es-CO')} servicios`}
      />

      <DateFilterBar filter={filter} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Total servicios" value={data.totalServicios.toLocaleString('es-CO')} icon={Package} iconBg="#e9f1fb" iconColor="#2a78d6" />
        {(Object.keys(STATUS_ICON) as (keyof typeof STATUS_ICON)[]).map((st) => (
          <StatCard
            key={st}
            label={st}
            value={(byEstado[st] || 0).toLocaleString('es-CO')}
            icon={STATUS_ICON[st]}
            iconBg={STATUS_SOFT_BG[st]}
            iconColor={STATUS_COLOR[st]}
          />
        ))}
      </div>

      <div className="mb-5 rounded-xl bg-white p-5 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200/70">
        <h2 className="text-sm font-bold text-slate-800">Servicios por proyecto y estado</h2>
        <p className="mb-4 text-xs text-slate-400">
          Acumulado por proyecto solicitante — fecha de solicitud. Top 14 por volumen (excluye &quot;OTRO&quot;, sin
          clasificar).
        </p>
        {data.porProyecto.length ? (
          <StackedBarList totals={data.porProyecto.slice(0, 14)} byKey={data.proyectoEstado} />
        ) : (
          <p className="py-8 text-center text-sm text-slate-400">Sin servicios para esta fecha.</p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200/70">
          <h2 className="text-sm font-bold text-slate-800">Servicios por franja horaria</h2>
          <p className="mb-2 text-xs text-slate-400">Hora de servicio solicitada, por ciudad</p>
          <FranjaChart
            porFranja={data.porFranja}
            franjaCiudad={data.franjaCiudad}
            ciudades={data.porCiudad.map((c) => c.key)}
          />
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200/70">
          <h2 className="text-sm font-bold text-slate-800">Servicios por ciudad</h2>
          <p className="mb-4 text-xs text-slate-400">Top 14 ciudades por volumen de solicitudes</p>
          {data.porCiudad.length ? (
            <RankingBarList items={data.porCiudad.slice(0, 14)} />
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">Sin servicios para esta fecha.</p>
          )}
        </div>
      </div>
    </div>
  );
}
