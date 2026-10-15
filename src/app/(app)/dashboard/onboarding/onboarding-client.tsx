'use client';

import { useMemo, useState } from 'react';
import { Users, CalendarCheck, TrendingUp, MapPin, Target, Award } from 'lucide-react';
import type { ServiceRow } from '@/lib/sheets';
import type { VinculacionRow } from '@/lib/onboarding';
import { buildOnboardingData, type AgilizadorMeta, type OnboardingKpis } from '@/lib/onboarding-aggregate';
import StatCard from '@/components/stat-card';
import ChartCard from '@/components/charts/chart-card';
import RankingBarList from '@/components/charts/ranking-bar-list';
import BarTrendChart from '@/components/charts/bar-trend-chart';
import TrendLineChart from '@/components/charts/trend-line-chart';
import VinculadosTable from './vinculados-table';
import VinculadoDetailPanel from '@/components/onboarding/vinculado-detail-panel';

const GESTION_LABEL: Record<string, string> = {
  'SIN GESTIÓN': 'Sin gestión',
  'PRIMER SERVICIO NO EFECTIVO': 'Primer servicio no efectivo',
  GESTIONANDO: 'Gestionando',
};

export default function OnboardingClient({
  rows,
  allRows,
  serviceRows,
  kpis,
  zamirMeta,
  isFilteredToday,
  filterLabel,
}: {
  // Vinculados según el filtro de fecha de arriba (Día/Rango/Mes).
  rows: VinculacionRow[];
  // Histórico completo — para gráficas de mes/día y la meta de Zamir.
  allRows: VinculacionRow[];
  // Datos_Actuales completo — para el cruce del panel de detalle.
  serviceRows: ServiceRow[];
  kpis: OnboardingKpis;
  zamirMeta: AgilizadorMeta;
  isFilteredToday: boolean;
  filterLabel: string;
}) {
  const [fAgilizador, setFAgilizador] = useState('');
  const [selected, setSelected] = useState<VinculacionRow | null>(null);

  const agilizadores = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach((r) => {
      if (r.agilizador) set.add(r.agilizador);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [allRows]);

  const scopedRows = useMemo(() => (fAgilizador ? rows.filter((r) => r.agilizador === fAgilizador) : rows), [rows, fAgilizador]);
  const scopedAllRows = useMemo(
    () => (fAgilizador ? allRows.filter((r) => r.agilizador === fAgilizador) : allRows),
    [allRows, fAgilizador]
  );

  const data = useMemo(() => buildOnboardingData(scopedRows), [scopedRows]);
  // Mes/día de vinculación: histórico completo (acotado solo por agilizador
  // si hay filtro), independiente del filtro de fecha de la página — mismo
  // patrón que el resto del panel.
  const historico = useMemo(() => buildOnboardingData(scopedAllRows), [scopedAllRows]);

  const mesPoints = historico.mesVinculacion.map((m) => ({ label: m.mesLabel, value: m.count }));
  const diaPoints = historico.diaVinculacion.map((d) => ({ label: d.fechaLabel, value: d.count }));

  const gestionItems = useMemo(
    () => data.porGestionStatus.map((g) => ({ key: GESTION_LABEL[g.key] || g.key, count: g.count })),
    [data.porGestionStatus]
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-2.5">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Agilizador</span>
          <select
            value={fAgilizador}
            onChange={(e) => setFAgilizador(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
          >
            <option value="">Todos</option>
            {agilizadores.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        {fAgilizador && (
          <button onClick={() => setFAgilizador('')} className="text-xs font-semibold text-[var(--accent-bright)] hover:underline">
            Limpiar filtro
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Vinculados"
          value={data.total.toLocaleString('es-CO')}
          icon={Users}
          iconColor="#f3c94f"
          sub={isFilteredToday ? undefined : filterLabel}
        />
        <StatCard label="Vinculados hoy" value={kpis.vinculadosHoy.toLocaleString('es-CO')} icon={CalendarCheck} iconColor="#4f9df5" />
        <StatCard
          label="Promedio por día"
          value={kpis.promedioPorDia.toLocaleString('es-CO', { maximumFractionDigits: 1 })}
          icon={TrendingUp}
          iconColor="#8a8a8a"
          sub="Histórico completo"
        />
        <StatCard
          label="Ciudad top"
          value={kpis.ciudadTop?.key || '—'}
          icon={MapPin}
          iconColor="#e2574c"
          sub={kpis.ciudadTop ? `${kpis.ciudadTop.count.toLocaleString('es-CO')} vinculados` : undefined}
        />
      </div>

      <ChartCard
        title="Ya gestionaron vs. sin gestión"
        description='Columna "gestión" del Sheet — cuántos de los vinculados ya trabajaron al menos un servicio.'
        className="mb-5"
      >
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="panel-card rounded-xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Ya gestionaron</p>
            <p className="mt-1 text-2xl font-bold text-[var(--accent-bright)] tabular-nums">{data.gestionaron}</p>
          </div>
          <div className="panel-card rounded-xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Sin gestión</p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-secondary)] tabular-nums">{data.sinGestion}</p>
          </div>
        </div>
        {gestionItems.length ? (
          <RankingBarList items={gestionItems} showPercent />
        ) : (
          <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin vinculaciones para esta fecha.</p>
        )}
      </ChartCard>

      <ChartCard
        title="Meta de vinculación — Zamir Andres Arcia"
        description="Meta: 5 vinculaciones por día / 150 al mes."
        className="mb-5"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Hoy"
            value={`${zamirMeta.vinculadosHoy} / ${zamirMeta.metaDiaria}`}
            icon={Target}
            iconColor={zamirMeta.pctDiaria >= 100 ? '#3fb950' : '#f3c94f'}
            sub={`${zamirMeta.pctDiaria}% de la meta diaria`}
          />
          <StatCard
            label="Este mes"
            value={`${zamirMeta.vinculadosMes} / ${zamirMeta.metaMensual}`}
            icon={Target}
            iconColor={zamirMeta.pctMensual >= 100 ? '#3fb950' : '#f3c94f'}
            sub={`${zamirMeta.pctMensual}% de la meta mensual`}
          />
          <StatCard
            label="Efectividad"
            value={`${zamirMeta.efectividadPct}%`}
            icon={Award}
            iconColor="#4f9df5"
            sub="% de sus vinculados que ya gestionan"
          />
        </div>
      </ChartCard>

      <ChartCard
        title="Vinculaciones por supervisor"
        description={`Columna "AGILIZADOR" — quién hizo la vinculación. ${isFilteredToday ? 'Hoy.' : filterLabel + '.'}`}
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

      <VinculadosTable rows={scopedRows} onSelect={setSelected} />

      <VinculadoDetailPanel vinculado={selected} serviceRows={serviceRows} onClose={() => setSelected(null)} />
    </div>
  );
}
