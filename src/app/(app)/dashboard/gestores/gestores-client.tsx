'use client';

import { useMemo, useState } from 'react';
import type { ServiceRow } from '@/lib/sheets';
import type { GestorStat, DiaSemanaPoint } from '@/lib/aggregate';
import type { SimpleDate } from '@/lib/date-filter';
import { STATUS_COLOR } from '@/lib/status-colors';
import type { TipoAsignadorTrend } from '@/lib/aggregate';
import ChartCard from '@/components/charts/chart-card';
import RankingBarList from '@/components/charts/ranking-bar-list';
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

export default function GestoresClient({
  gestorStats,
  porTipoAsignador,
  asignadorTrend,
  diaSemana,
  allRows,
  defaultDay,
}: {
  gestorStats: GestorStat[];
  porTipoAsignador: { key: string; count: number }[];
  asignadorTrend: TipoAsignadorTrend;
  diaSemana: DiaSemanaPoint[];
  allRows: ServiceRow[];
  defaultDay: SimpleDate;
}) {
  const [fGestor, setFGestor] = useState('');
  const [openGestor, setOpenGestor] = useState<string | null>(null);

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

  // Efectividad general del período/filtro actual: finalizados / total de
  // servicios de los gestores visibles (misma base que "Productividad por
  // gestor" más abajo, solo que agregada).
  const efectividad = useMemo(() => {
    const total = filteredStats.reduce((s, g) => s + g.total, 0);
    const finalizado = filteredStats.reduce((s, g) => s + g.finalizado, 0);
    return total ? Math.round((finalizado / total) * 1000) / 10 : 0;
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

      <ChartCard
        title="Composición de gestores"
        description='Conteo de personas, no de servicios. "Otro" = vacaciones + supervisor. Excluye "Agilizador no asignado".'
        className="mb-5"
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="panel-card rounded-xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Agilizadores</p>
            <p className="mt-1 text-2xl font-bold text-[var(--accent-bright)] tabular-nums">{cargoBreakdown.agilizador}</p>
            {cargoBreakdown.topAgilizador && (
              <p className="text-xs text-[var(--text-muted)]">
                Top: <span className="font-semibold text-[var(--text-secondary)]">{cargoBreakdown.topAgilizador.gestor}</span> (
                {cargoBreakdown.topAgilizador.total.toLocaleString('es-CO')})
              </p>
            )}
          </div>
          <div className="panel-card rounded-xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Administrativos</p>
            <p className="mt-1 text-2xl font-bold text-[var(--text)] tabular-nums">{cargoBreakdown.administrativo}</p>
          </div>
          <div className="panel-card rounded-xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Otro (vacaciones/supervisor)</p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-secondary)] tabular-nums">{cargoBreakdown.otro}</p>
          </div>
        </div>
      </ChartCard>

      <ChartCard
        title="Servicios por gestor"
        description='Volumen total gestionado — todos los estados (excluye "OTRO"/"OTROS"/"NN")'
        className="mb-5"
      >
        {filteredStats.length ? (
          <RankingBarList items={filteredStats.map((g) => ({ key: g.gestor, count: g.total }))} />
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin servicios para esta fecha.</p>
        )}
      </ChartCard>

      <ChartCard title="Productividad por gestor" description="% cumplimiento = finalizados / total de servicios del gestor. Clic en un gestor para ver su detalle.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-xs">
            <thead>
              <tr>
                {['Gestor', 'Cargo', 'Total', 'Finalizado', 'Cancelado', 'En proceso', 'Cumplimiento'].map((h) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <ChartCard
        title="Quién está asignando — Agilizador vs. Administrativo"
        description='Columna "Tipo Asignador" del Sheet — quién hizo la asignación del servicio. "Otro" son agilizadores externos o servicios sin asignar.'
        className="mb-5"
      >
        {porTipoAsignador.length ? (
          <>
            {(asignadorPorTipo.agilizador > 0 || asignadorPorTipo.coordinador > 0) && (
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="panel-card rounded-xl p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Asignado por agilizadores</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--accent-bright)] tabular-nums">{asignadorPorTipo.pctAgilizador}%</p>
                  <p className="text-xs text-[var(--text-muted)]">{asignadorPorTipo.agilizador.toLocaleString('es-CO')} servicios</p>
                </div>
                <div className="panel-card rounded-xl p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Asignado por administrativos</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--text)] tabular-nums">{asignadorPorTipo.pctCoordinador}%</p>
                  <p className="text-xs text-[var(--text-muted)]">{asignadorPorTipo.coordinador.toLocaleString('es-CO')} servicios</p>
                </div>
                <div className="panel-card rounded-xl p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Efectividad</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: STATUS_COLOR['Finalizado'] }}>
                    {efectividad}%
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">Finalizados / total ({fGestor || 'todos los gestores'})</p>
                </div>
              </div>
            )}
            <RankingBarList
              items={porTipoAsignador.map((t) => ({ key: TIPO_ASIGNADOR_LABEL[t.key] || t.key, count: t.count }))}
            />
          </>
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
