'use client';

import { useMemo, useState } from 'react';
import { Plus, Pencil, AlertTriangle, Ban, BadgeCheck, List, BarChart3, Users, ShieldCheck, FileWarning } from 'lucide-react';
import type { DirectorioEntry } from '@/lib/directorio-types';
import { emptyDirectorioEntry, esAsignacionPosteriorAlVeto } from '@/lib/directorio-types';
import { formatMonthLabel } from '@/lib/date-filter';
import ChartCard from '@/components/charts/chart-card';
import StatCard from '@/components/stat-card';
import RankingBarList from '@/components/charts/ranking-bar-list';
import BarTrendChart from '@/components/charts/bar-trend-chart';
import DirectorioEditModal from './directorio-edit-modal';

type ActiveAssignment = {
  identTrabajador: string;
  proyecto: string;
  id: string;
  estado: string;
  fechaHoraAsignado: string;
  fechaSolicitud: string;
};

type NovedadEntry = DirectorioEntry & { ciudad: string; tipoVehiculo: string };

const TABS = [
  { key: 'lista', label: 'Lista', icon: List },
  { key: 'analisis', label: 'Análisis', icon: BarChart3 },
] as const;
type Tab = (typeof TABS)[number]['key'];

export default function DirectorioClient({
  entries,
  activeAssignments,
  proyectos,
  canEdit,
}: {
  entries: NovedadEntry[];
  activeAssignments: ActiveAssignment[];
  proyectos: string[];
  canEdit: boolean;
}) {
  const [tab, setTab] = useState<Tab>('lista');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<DirectorioEntry | null>(null);

  const violations = useMemo(() => {
    return entries
      .filter((e) => e.contratadoFijo && e.contratadoFijoProyecto)
      .map((e) => ({
        entry: e,
        foreign: activeAssignments.filter((a) => a.identTrabajador === e.identTrabajador && a.proyecto !== e.contratadoFijoProyecto),
      }))
      .filter((v) => v.foreign.length > 0);
  }, [entries, activeAssignments]);

  // Alguien vetado de un proyecto que igual aparece con una asignación
  // activa EN ese mismo proyecto — es justo lo que el veto debía evitar.
  const vetoViolations = useMemo(() => {
    return entries
      .filter((e) => e.vetado && e.vetadoProyectos.length > 0)
      .map((e) => ({
        entry: e,
        activas: activeAssignments.filter(
          (a) =>
            a.identTrabajador === e.identTrabajador &&
            e.vetadoProyectos.includes(a.proyecto) &&
            esAsignacionPosteriorAlVeto(a, e.vetadoDesde)
        ),
      }))
      .filter((v) => v.activas.length > 0);
  }, [entries, activeAssignments]);

  const filtered = useMemo(() => {
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter((e) => e.nombreTrabajador.toLowerCase().includes(q) || e.identTrabajador.toLowerCase().includes(q));
  }, [entries, search]);

  const vetados = useMemo(() => entries.filter((e) => e.vetado), [entries]);
  const fijos = useMemo(() => entries.filter((e) => e.contratadoFijo), [entries]);
  const conNotas = useMemo(() => entries.filter((e) => e.notas.trim() !== ''), [entries]);

  const vetadosPorProyecto = useMemo(() => {
    const map: Record<string, number> = {};
    vetados.forEach((e) => {
      const proys = e.vetadoProyectos.length ? e.vetadoProyectos : ['Sin proyecto especificado'];
      proys.forEach((p) => {
        map[p] = (map[p] || 0) + 1;
      });
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([key, count]) => ({ key, count }));
  }, [vetados]);

  const vetadosPorCiudad = useMemo(() => {
    const map: Record<string, number> = {};
    vetados.forEach((e) => {
      const c = e.ciudad || 'Sin ciudad';
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([key, count]) => ({ key, count }));
  }, [vetados]);

  const fijosPorProyecto = useMemo(() => {
    const map: Record<string, number> = {};
    fijos.forEach((e) => {
      const p = e.contratadoFijoProyecto || 'Sin proyecto especificado';
      map[p] = (map[p] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([key, count]) => ({ key, count }));
  }, [fijos]);

  const vetadosPorMes = useMemo(() => {
    const map: Record<string, { label: string; value: number }> = {};
    vetados.forEach((e) => {
      if (!e.vetadoDesde) return;
      const [y, m] = e.vetadoDesde.split('-').map(Number);
      if (!y || !m) return;
      const key = e.vetadoDesde.slice(0, 7);
      if (!map[key]) map[key] = { label: formatMonthLabel(y, m), value: 0 };
      map[key].value += 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [vetados]);

  return (
    <div>
      {vetoViolations.length > 0 && (
        <div className="mb-5 rounded-xl border border-red-900/40 bg-red-950/30 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-red-300">
            <AlertTriangle size={16} className="flex-none" />
            {vetoViolations.length} mensajero{vetoViolations.length === 1 ? '' : 's'} vetado{vetoViolations.length === 1 ? '' : 's'} con
            asignaciones activas EN el proyecto del que está vetado — reasignar ya.
          </div>
          <ul className="space-y-1 text-xs text-red-300/90">
            {vetoViolations.map(({ entry, activas }) => (
              <li key={entry.identTrabajador}>
                <b>{entry.nombreTrabajador}</b> (vetado de {entry.vetadoProyectos.join(', ')}) tiene activo:{' '}
                {activas.map((a) => `${a.id} (${a.proyecto})`).join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {violations.length > 0 && (
        <div className="mb-5 rounded-xl border border-red-900/40 bg-red-950/30 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-red-300">
            <AlertTriangle size={16} className="flex-none" />
            {violations.length} mensajero{violations.length === 1 ? '' : 's'} contratado{violations.length === 1 ? '' : 's'} fijo con
            asignaciones activas fuera de su proyecto — esto no debería pasar.
          </div>
          <ul className="space-y-1 text-xs text-red-300/90">
            {violations.map(({ entry, foreign }) => (
              <li key={entry.identTrabajador}>
                <b>{entry.nombreTrabajador}</b> (fijo en {entry.contratadoFijoProyecto}) aparece activo en:{' '}
                {Array.from(new Set(foreign.map((f) => f.proyecto))).join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mb-5 flex gap-2 border-b border-[var(--border)]">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-colors ${
                tab === t.key ? 'border-[var(--accent)] text-[var(--accent-bright)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'lista' && (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o identificación…"
              className="w-72 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 text-xs text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
            />
            {canEdit && (
              <button
                onClick={() => setEditing(emptyDirectorioEntry())}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-gold px-3 py-2 text-xs font-bold text-[#141008] transition-all hover:brightness-110 active:scale-[0.98]"
              >
                <Plus size={14} />
                Agregar novedad
              </button>
            )}
          </div>

          <ChartCard
            title="Novedades de mensajeros"
            description={`${filtered.length.toLocaleString('es-CO')} registrados — solo vetados, contratados fijos o con alguna novedad`}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-xs">
                <thead>
                  <tr>
                    {['Nombre', 'Identificación', 'Ciudad', 'Vehículo', 'Teléfono', 'Estado', 'Vetado', 'Contratado fijo', ''].map((h) => (
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
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-10 text-center text-[var(--text-muted)]">
                        Sin mensajeros que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((e) => {
                      const hasViolation = violations.some((v) => v.entry.identTrabajador === e.identTrabajador);
                      const hasVetoViolation = vetoViolations.some((v) => v.entry.identTrabajador === e.identTrabajador);
                      return (
                        <tr key={e.identTrabajador} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]">
                          <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[var(--text)]">{e.nombreTrabajador}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{e.identTrabajador}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{e.ciudad || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{e.tipoVehiculo || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{e.telefono || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            <span
                              className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                              style={
                                e.estado === 'Activo'
                                  ? { background: '#1baf7a2e', color: '#1baf7a' }
                                  : { background: '#8a8a8a2e', color: '#8a8a8a' }
                              }
                            >
                              {e.estado}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {e.vetado ? (
                              <span className="flex flex-wrap items-center gap-1">
                                {hasVetoViolation && <AlertTriangle size={12} className="flex-none text-red-400" />}
                                {e.vetadoProyectos.length ? (
                                  e.vetadoProyectos.map((p) => (
                                    <span
                                      key={p}
                                      title={e.vetadoMotivo}
                                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-500/20 px-2 py-0.5 text-[10.5px] font-bold text-red-400"
                                    >
                                      <Ban size={11} />
                                      {p}
                                    </span>
                                  ))
                                ) : (
                                  <span
                                    title={e.vetadoMotivo}
                                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-500/20 px-2 py-0.5 text-[10.5px] font-bold text-red-400"
                                  >
                                    <Ban size={11} />
                                    Sí
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)]">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5">
                            {e.contratadoFijo ? (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                                  hasViolation ? 'bg-red-500/20 text-red-400' : 'bg-[var(--accent-soft)] text-[var(--accent-bright)]'
                                }`}
                              >
                                {hasViolation ? <AlertTriangle size={11} /> : <BadgeCheck size={11} />}
                                {e.contratadoFijoProyecto || 'Sí'}
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)]">—</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right">
                            {canEdit && (
                              <button
                                onClick={() => setEditing(e)}
                                className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--accent-bright)]"
                              >
                                <Pencil size={11} />
                                Editar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </>
      )}

      {tab === 'analisis' && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Total vetados" value={vetados.length.toLocaleString('es-CO')} icon={Ban} iconColor="#e2574c" />
            <StatCard label="Contratados fijos" value={fijos.length.toLocaleString('es-CO')} icon={ShieldCheck} iconColor="#4f9df5" />
            <StatCard label="Con novedades anotadas" value={conNotas.length.toLocaleString('es-CO')} icon={FileWarning} iconColor="#f3c94f" />
            <StatCard
              label="Violaciones activas"
              value={(vetoViolations.length + violations.length).toLocaleString('es-CO')}
              icon={Users}
              iconColor="#e2574c"
              sub={`${vetoViolations.length} vetado(s) reincidente(s) · ${violations.length} fijo(s) fuera de operación`}
            />
          </div>

          <ChartCard title="Vetados por mes" description="Según la fecha en que se marcó el veto — para ver si la tendencia sube o baja." className="mb-5">
            <BarTrendChart points={vetadosPorMes} emptyMessage="Sin vetos registrados todavía." />
          </ChartCard>

          <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard title="Vetados por proyecto / operación" description="Suma más de 100% si alguien está vetado de varios proyectos a la vez.">
              {vetadosPorProyecto.length ? (
                <RankingBarList items={vetadosPorProyecto} showPercent />
              ) : (
                <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin vetos registrados todavía.</p>
              )}
            </ChartCard>
            <ChartCard title="Vetados por ciudad">
              {vetadosPorCiudad.length ? (
                <RankingBarList items={vetadosPorCiudad} showPercent />
              ) : (
                <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin vetos registrados todavía.</p>
              )}
            </ChartCard>
          </div>

          <ChartCard title="Contratados fijos por proyecto / operación">
            {fijosPorProyecto.length ? (
              <RankingBarList items={fijosPorProyecto} showPercent />
            ) : (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin contratados fijos registrados todavía.</p>
            )}
          </ChartCard>
        </>
      )}

      {canEdit && <DirectorioEditModal entry={editing} proyectos={proyectos} onClose={() => setEditing(null)} />}
    </div>
  );
}
