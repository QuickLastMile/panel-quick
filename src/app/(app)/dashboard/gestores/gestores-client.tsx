'use client';

import { useMemo, useState } from 'react';
import { Users, UserCog, Users2, Percent, CheckCircle2, Timer } from 'lucide-react';
import type { ServiceRow } from '@/lib/sheets';
import type { GestorStat, DiaSemanaPoint } from '@/lib/aggregate';
import type { SimpleDate } from '@/lib/date-filter';
import { STATUS_COLOR } from '@/lib/status-colors';
import type { TipoAsignadorTrend } from '@/lib/aggregate';
import StatCard from '@/components/stat-card';
import ChartCard from '@/components/charts/chart-card';
import RankingBarList from '@/components/charts/ranking-bar-list';
import TrendLineChart from '@/components/charts/trend-line-chart';
import AsignadorMesChart from '@/components/charts/asignador-mes-chart';
import AsignadorDiaTrendChart from '@/components/charts/asignador-dia-trend-chart';
import DiaSemanaChart from '@/components/charts/dia-semana-chart';
import GestorDetailPanel from '@/components/gestor-detail-panel';

const EN_PROCESO_COLOR = STATUS_COLOR['Asignado'];

const TIPO_ASIGNADOR_LABEL: Record<string, string> = {
  AGILIZADOR: 'Agilizador',
  COORDINADOR: 'Administrativo (Coordinador)',
  OTRO: 'Otro / externo',
};

function formatMinutos(min: number): string {
  // Redondea el total primero y luego separa en horas/minutos — redondear
  // cada parte por separado puede "acarrear" un 59.6 a "60min" sueltos.
  const total = Math.round(min);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${m}min`;
}

export default function GestoresClient({
  gestorStats,
  porTipoAsignador,
  asignadorTrend,
  diaSemana,
  porHoraAsignacion,
  allRows,
  defaultDay,
}: {
  gestorStats: GestorStat[];
  porTipoAsignador: { key: string; count: number }[];
  asignadorTrend: TipoAsignadorTrend;
  diaSemana: DiaSemanaPoint[];
  porHoraAsignacion: { hora: number; count: number }[];
  allRows: ServiceRow[];
  defaultDay: SimpleDate;
}) {
  const [fGestor, setFGestor] = useState('');
  const [openGestor, setOpenGestor] = useState<string | null>(null);
  const [gestorView, setGestorView] = useState<'cantidad' | 'tiempo'>('cantidad');

  const gestores = useMemo(() => gestorStats.map((g) => g.gestor).sort((a, b) => a.localeCompare(b, 'es')), [gestorStats]);

  const asignadorPorTipo = useMemo(() => {
    const byKey = Object.fromEntries(porTipoAsignador.map((t) => [t.key, t.count]));
    const agilizador = byKey['AGILIZADOR'] || 0;
    const coordinador = byKey['COORDINADOR'] || 0;
    const base = agilizador + coordinador;
    return {
      agilizador,
      coordinador,
      pctAgilizador: base ? Math.round((agilizador / base) * 1000) / 10 : 0,
      pctCoordinador: base ? Math.round((coordinador / base) * 1000) / 10 : 0,
    };
  }, [porTipoAsignador]);

  const filteredStats = useMemo(
    () => (fGestor ? gestorStats.filter((g) => g.gestor === fGestor) : gestorStats),
    [gestorStats, fGestor]
  );

  // Efectividad = (Asignado + En Tránsito + Finalizado) / total — los
  // servicios que avanzaron de verdad, sin importar si ya terminaron.
  const efectividad = useMemo(() => {
    const total = filteredStats.reduce((s, g) => s + g.total, 0);
    const productivos = filteredStats.reduce((s, g) => s + g.asignado + g.enTransito + g.finalizado, 0);
    return total ? Math.round((productivos / total) * 1000) / 10 : 0;
  }, [filteredStats]);

  // Tiempo promedio de asignación (desde creación hasta asignación) — se
  // suman minutos y conteos crudos antes de dividir para no promediar
  // promedios cuando hay varios gestores.
  const tiempoPromedioAsignacion = useMemo(() => {
    const sum = filteredStats.reduce((s, g) => s + g.minutosAsignacionSum, 0);
    const count = filteredStats.reduce((s, g) => s + g.minutosAsignacionCount, 0);
    return count ? sum / count : null;
  }, [filteredStats]);

  // Censo de PERSONAS (no de servicios): cuántos gestores distintos son
  // agilizador / administrativo / otro (vacaciones + supervisor), excluyendo
  // "Agilizador no asignado" (es un relleno, no una persona real).
  const cargoBreakdown = useMemo(() => {
    let agilizador = 0;
    let administrativo = 0;
    let otro = 0;
    let topAgilizador: GestorStat | null = null;
    filteredStats.forEach((g) => {
      const cargo = (g.cargo || '').trim().toUpperCase();
      if (!cargo) return;
      if (cargo.startsWith('AGILIZADOR NO ASIGNADO')) return;
      if (cargo.startsWith('AGILIZADOR')) {
        agilizador += 1;
        if (!topAgilizador || g.total > topAgilizador.total) topAgilizador = g;
      } else if (cargo.startsWith('ADMINISTRATIVO')) {
        administrativo += 1;
      } else if (cargo.startsWith('VACACIONES') || cargo.startsWith('SUPERVISOR')) {
        otro += 1;
      }
    });
    return { agilizador, administrativo, otro, topAgilizador } as {
      agilizador: number;
      administrativo: number;
      otro: number;
      topAgilizador: GestorStat | null;
    };
  }, [filteredStats]);

  const horaAsignacionPoints = useMemo(
    () => porHoraAsignacion.map((p) => ({ label: `${String(p.hora).padStart(2, '0')}:00`, value: p.count })),
    [porHoraAsignacion]
  );

  const gestorChartItems = useMemo(() => {
    if (gestorView === 'cantidad') return filteredStats.map((g) => ({ key: g.gestor, count: g.total }));
    return filteredStats
      .filter((g) => g.minutosAsignacionCount > 0)
      .map((g) => ({ key: g.gestor, count: Math.round(g.minutosAsignacionSum / g.minutosAsignacionCount) }))
      .sort((a, b) => a.count - b.count);
  }, [filteredStats, gestorView]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-2.5">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Gestor</span>
          <select
            value={fGestor}
            onChange={(e) => setFGestor(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
          >
            <option value="">Todos</option>
            {gestores.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        {fGestor && (
          <button onClick={() => setFGestor('')} className="text-xs font-semibold text-[var(--accent-bright)] hover:underline">
            Limpiar filtro
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Agilizadores" value={String(cargoBreakdown.agilizador)} icon={Users} iconColor="#f3c94f" sub={cargoBreakdown.topAgilizador ? `Top: ${cargoBreakdown.topAgilizador.gestor}` : undefined} />
        <StatCard label="Administrativos" value={String(cargoBreakdown.administrativo)} icon={UserCog} iconColor="#4f9df5" />
        <StatCard label="Otro (vac./superv.)" value={String(cargoBreakdown.otro)} icon={Users2} iconColor="#8a8a8a" />
        <StatCard label="Asignado por agiliz." value={`${asignadorPorTipo.pctAgilizador}%`} icon={Percent} iconColor="#f3c94f" sub={`${asignadorPorTipo.agilizador.toLocaleString('es-CO')} servicios`} />
        <StatCard label="Asignado por admin." value={`${asignadorPorTipo.pctCoordinador}%`} icon={Percent} iconColor="#4f9df5" sub={`${asignadorPorTipo.coordinador.toLocaleString('es-CO')} servicios`} />
        <StatCard label="Efectividad" value={`${efectividad}%`} icon={CheckCircle2} iconColor={STATUS_COLOR['Finalizado']} sub="Asignado + En tránsito + Finalizado / total" />
        <StatCard
          label="Tiempo prom. asignación"
          value={tiempoPromedioAsignacion !== null ? formatMinutos(tiempoPromedioAsignacion) : '—'}
          icon={Timer}
          iconColor="#e2574c"
          sub="Desde creación hasta asignación"
        />
      </div>

      <ChartCard
        title="Asignaciones por franja horaria"
        description='Columna "HORA ASIGNACIÓN" — a qué hora se asignan más servicios. Usa el filtro de fecha de arriba.'
        className="mb-5"
      >
        <TrendLineChart points={horaAsignacionPoints} emptyMessage="Sin asignaciones para esta fecha." />
      </ChartCard>

      <ChartCard
        title="Servicios por gestor"
        description='Volumen total gestionado — todos los estados (excluye "OTRO"/"OTROS"/"NN")'
        className="mb-5"
      >
        <div className="mb-4 flex items-center gap-1 rounded-lg bg-[var(--surface-sunken)] p-1 w-fit">
          <button
            onClick={() => setGestorView('cantidad')}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all duration-150 ${
              gestorView === 'cantidad'
                ? 'bg-gradient-gold text-[#141008] shadow-[0_0_12px_rgba(214,164,25,0.25)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            Cantidad
          </button>
          <button
            onClick={() => setGestorView('tiempo')}
            className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all duration-150 ${
              gestorView === 'tiempo'
                ? 'bg-gradient-gold text-[#141008] shadow-[0_0_12px_rgba(214,164,25,0.25)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            Tiempo promedio (min)
          </button>
        </div>
        {gestorChartItems.length ? (
          <RankingBarList items={gestorChartItems} />
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">
            {gestorView === 'tiempo' ? 'Sin datos de tiempo de asignación para este filtro.' : 'Sin servicios para esta fecha.'}
          </p>
        )}
      </ChartCard>

      <ChartCard title="Productividad por gestor" description="% cumplimiento = finalizados / total de servicios del gestor. Clic en un gestor para ver su detalle.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-xs">
            <thead>
              <tr>
                {['Gestor', 'Cargo', 'Total', 'Finalizado', 'Cancelado', 'En proceso', 'Cumplimiento', 'Tiempo prom. asignación'].map((h) => (
                  <th
                    key={h}
                    className="border-b border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStats.map((g) => (
                <tr
                  key={g.gestor}
                  onClick={() => setOpenGestor(g.gestor)}
                  className="cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]"
                >
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[var(--text)]">{g.gestor}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{g.cargo || '—'}</td>
                  <td className="px-3 py-2.5 tabular-nums text-[var(--text-secondary)]">{g.total.toLocaleString('es-CO')}</td>
                  <td className="px-3 py-2.5 tabular-nums font-semibold" style={{ color: STATUS_COLOR['Finalizado'] }}>
                    {g.finalizado.toLocaleString('es-CO')}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums font-semibold" style={{ color: STATUS_COLOR['Cancelado'] }}>
                    {g.cancelado.toLocaleString('es-CO')}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums font-semibold" style={{ color: EN_PROCESO_COLOR }}>
                    {g.enProceso.toLocaleString('es-CO')}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                        <div
                          className="h-full animate-grow-width rounded-full bg-gradient-gold"
                          style={{ width: `${Math.min(g.cumplimientoPct, 100)}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-[var(--text-secondary)]">{g.cumplimientoPct}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-[var(--text-secondary)]">
                    {g.minutosAsignacionCount ? formatMinutos(g.minutosAsignacionSum / g.minutosAsignacionCount) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <div className="h-5" />

      <ChartCard
        title="Quién está asignando — Agilizador vs. Administrativo"
        description='Columna "Tipo Asignador" del Sheet — quién hizo la asignación del servicio. "Otro" son agilizadores externos o servicios sin asignar.'
        className="mb-5"
      >
        {porTipoAsignador.length ? (
          <RankingBarList items={porTipoAsignador.map((t) => ({ key: TIPO_ASIGNADOR_LABEL[t.key] || t.key, count: t.count }))} />
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin servicios para esta fecha.</p>
        )}
      </ChartCard>

      <ChartCard
        title="Asignación por mes — Agilizador vs. Administrativo"
        description="Histórico completo, independiente del filtro de día de la página."
        className="mb-5"
      >
        <AsignadorMesChart mesTipo={asignadorTrend.mesTipo} />
      </ChartCard>

      <ChartCard
        title="Tendencia diaria — Agilizador vs. Administrativo"
        description="Histórico completo, independiente del filtro de día — filtra por mes desde aquí."
        className="mb-5"
      >
        <AsignadorDiaTrendChart diaTipo={asignadorTrend.diaTipo} />
      </ChartCard>

      <ChartCard
        title="Asignaciones por día de la semana"
        description="Histórico completo — filtra por gestor y por mes desde aquí."
      >
        <DiaSemanaChart diaSemana={diaSemana} />
      </ChartCard>

      <GestorDetailPanel gestor={openGestor} allRows={allRows} defaultDay={defaultDay} onClose={() => setOpenGestor(null)} />
    </div>
  );
}
