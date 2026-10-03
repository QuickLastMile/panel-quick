'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, CalendarDays, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { ServiceRow } from '@/lib/sheets';
import { normEstado } from '@/lib/aggregate';
import { STATUS_COLOR } from '@/lib/status-colors';
import { bogotaToday, daysBetween, parseFechaSolicitud, type SimpleDate } from '@/lib/date-filter';
import StatusPill from './status-pill';
import TrendLineChart from './charts/trend-line-chart';

const TABS = ['General', 'Gestión', 'Seguimiento'] as const;
type Tab = (typeof TABS)[number];

const TERMINAL = new Set(['Finalizado', 'Cancelado']);

function addDays(d: SimpleDate, delta: number): SimpleDate {
  const date = new Date(Date.UTC(d.year, d.month - 1, d.day));
  date.setUTCDate(date.getUTCDate() + delta);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function sameDay(f: SimpleDate | null, d: SimpleDate): boolean {
  return !!f && f.year === d.year && f.month === d.month && f.day === d.day;
}

function SeguimientoTable({ rows }: { rows: { row: ServiceRow; diff: number }[] }) {
  if (rows.length === 0) {
    return <p className="rounded-lg border border-[var(--border)] px-3 py-4 text-center text-xs text-[var(--text-muted)]">Ninguno.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full min-w-[640px] border-collapse text-xs">
        <thead>
          <tr>
            {['ID servicio', 'Proyecto', 'Estado', 'Fecha solicitud', 'Días de atraso'].map((h) => (
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
          {rows.map(({ row, diff }) => (
            <tr key={row.id} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]">
              <td className="whitespace-nowrap px-3 py-2 font-semibold text-[var(--text)]">{row.id}</td>
              <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)]">{row.proyecto}</td>
              <td className="whitespace-nowrap px-3 py-2">
                <StatusPill status={row.estado} />
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)]">{row.fechaSolicitud}</td>
              <td className="whitespace-nowrap px-3 py-2">
                <span className="inline-flex items-center gap-1 font-bold text-red-400">
                  <AlertTriangle size={12} />
                  {diff} día{diff === 1 ? '' : 's'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GestorDetailPanel({
  gestor,
  allRows,
  defaultDay,
  onClose,
}: {
  gestor: string | null;
  allRows: ServiceRow[];
  defaultDay: SimpleDate;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>('General');
  const [day, setDay] = useState<SimpleDate>(defaultDay);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (gestor) {
      setTab('General');
      setDay(defaultDay);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gestor]);

  useEffect(() => {
    if (!gestor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [gestor, onClose]);

  const today = bogotaToday();
  const gestorRows = useMemo(() => (gestor ? allRows.filter((r) => r.gestor === gestor) : []), [allRows, gestor]);
  const cargo = gestorRows[0]?.cargoGestor || '';

  const activos = useMemo(() => gestorRows.filter((r) => !TERMINAL.has(normEstado(r.estado))), [gestorRows]);

  const dayRows = useMemo(
    () => gestorRows.filter((r) => sameDay(parseFechaSolicitud(r.fechaSolicitud), day)),
    [gestorRows, day]
  );
  const enEsperaDia = dayRows.filter((r) => r.estado === 'En Espera').length;
  const asignadoDia = dayRows.filter((r) => r.estado === 'Asignado').length;
  const maxDia = Math.max(enEsperaDia, asignadoDia, 1);

  const asignacionesPorDia = useMemo(() => {
    const map: Record<string, number> = {};
    gestorRows.forEach((r) => {
      if (!r.fechaHoraAsignado) return;
      const d = r.fechaHoraAsignado.slice(0, 10);
      if (d.length === 10) map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ label: `${k.slice(8, 10)}/${k.slice(5, 7)}`, value: v }));
  }, [gestorRows]);

  const seguimiento = useMemo(() => {
    return gestorRows
      .map((r) => {
        const f = parseFechaSolicitud(r.fechaSolicitud);
        if (!f) return null;
        return { row: r, diff: daysBetween(f, today) };
      })
      // daysBetween(f, today) = today - f: positivo cuando la fecha de
      // solicitud ya pasó (lo que nos interesa acá, no fechas futuras).
      .filter((x): x is { row: ServiceRow; diff: number } => !!x && x.diff > 0 && !TERMINAL.has(normEstado(x.row.estado)))
      .sort((a, b) => b.diff - a.diff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gestorRows, today.year, today.month, today.day]);

  const pastTotal = useMemo(() => {
    return gestorRows.filter((r) => {
      const f = parseFechaSolicitud(r.fechaSolicitud);
      return f && daysBetween(f, today) > 0;
    }).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gestorRows, today.year, today.month, today.day]);
  const pastClosedPct = pastTotal ? Math.round(((pastTotal - seguimiento.length) / pastTotal) * 1000) / 10 : 100;

  // Tasa global del equipo (todos los gestores juntos) con la misma lógica,
  // para tener un punto de comparación — un 92% no dice nada si no se sabe
  // si el resto del equipo está en 98% o en 80%.
  const teamClosedPct = useMemo(() => {
    let past = 0;
    let open = 0;
    allRows.forEach((r) => {
      const f = parseFechaSolicitud(r.fechaSolicitud);
      if (!f || daysBetween(f, today) <= 0) return;
      past++;
      if (!TERMINAL.has(normEstado(r.estado))) open++;
    });
    return past ? Math.round(((past - open) / past) * 1000) / 10 : 100;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, today.year, today.month, today.day]);

  // Sin asignar = nunca se le dio mensajero; asignado-no-cerrado = ya tiene
  // mensajero pero no se le dio seguimiento al cierre. Son dos fallas
  // distintas y piden acciones distintas.
  const sinAsignar = useMemo(() => seguimiento.filter(({ row }) => normEstado(row.estado) === 'En Espera'), [seguimiento]);
  const asignadoSinCerrar = useMemo(() => seguimiento.filter(({ row }) => normEstado(row.estado) !== 'En Espera'), [seguimiento]);

  // Antigüedad del atraso: no hay snapshots históricos del backlog (el Sheet
  // solo guarda el estado actual), así que esto es la mejor aproximación
  // posible a "qué tan grave está" sin esos datos.
  const antiguedadBuckets = useMemo(() => {
    const defs = [
      { label: '1 día', min: 1, max: 1 },
      { label: '2-3 días', min: 2, max: 3 },
      { label: '4-7 días', min: 4, max: 7 },
      { label: '8+ días', min: 8, max: Infinity },
    ];
    return defs.map((b) => ({ ...b, count: seguimiento.filter((s) => s.diff >= b.min && s.diff <= b.max).length }));
  }, [seguimiento]);
  const maxBucket = Math.max(...antiguedadBuckets.map((b) => b.count), 1);

  const porProyecto = useMemo(() => {
    const map: Record<string, number> = {};
    seguimiento.forEach(({ row }) => {
      const key = row.proyecto || 'Sin proyecto';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);
  }, [seguimiento]);

  const porCiudad = useMemo(() => {
    const map: Record<string, number> = {};
    seguimiento.forEach(({ row }) => {
      const key = row.ciudad || 'Sin ciudad';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);
  }, [seguimiento]);

  if (!gestor || !mounted) return null;

  const dayValue = `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 animate-fade-in-up bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl md:inset-x-8 md:inset-y-6">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">Gestor</p>
            <h2 className="mt-0.5 text-lg font-bold text-[var(--text)]">{gestor}</h2>
            {cargo && <p className="text-xs text-[var(--text-muted)]">{cargo}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex-none rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--accent-bright)]"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 border-b border-[var(--border)] px-5 pt-3">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-t-lg px-3 py-2 text-xs font-bold transition-colors ${
                tab === t
                  ? 'border-b-2 border-[var(--accent)] text-[var(--accent-bright)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-5">
          {tab === 'General' && (
            <div>
              <p className="mb-3 text-xs text-[var(--text-muted)]">
                Servicios que este gestor tiene activos ahora mismo (no finalizados ni cancelados) — {activos.length.toLocaleString('es-CO')} en
                total.
              </p>
              {activos.length === 0 ? (
                <p className="py-10 text-center text-sm text-[var(--text-muted)]">Sin servicios activos en este momento.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                  <table className="w-full min-w-[640px] border-collapse text-xs">
                    <thead>
                      <tr>
                        {['ID servicio', 'Proyecto', 'Estado', 'Ciudad', 'Fecha solicitud'].map((h) => (
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
                      {activos.map((r) => (
                        <tr key={r.id} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]">
                          <td className="whitespace-nowrap px-3 py-2 font-semibold text-[var(--text)]">{r.id}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)]">{r.proyecto}</td>
                          <td className="whitespace-nowrap px-3 py-2">
                            <StatusPill status={r.estado} />
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)]">{r.ciudad}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)]">{r.fechaSolicitud}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'Gestión' && (
            <div className="space-y-5">
              <div className="panel-card flex flex-wrap items-center gap-2 rounded-xl p-3">
                <button
                  onClick={() => setDay((d) => addDays(d, -1))}
                  className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  aria-label="Día anterior"
                >
                  <ChevronLeft size={15} />
                </button>
                <label className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)]">
                  <CalendarDays size={14} className="text-[var(--accent-bright)]" />
                  <input
                    type="date"
                    value={dayValue}
                    onChange={(e) => {
                      const [y, m, d] = e.target.value.split('-').map(Number);
                      if (y && m && d) setDay({ year: y, month: m, day: d });
                    }}
                    className="bg-transparent outline-none [color-scheme:dark]"
                  />
                </label>
                <button
                  onClick={() => setDay((d) => addDays(d, 1))}
                  className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  aria-label="Día siguiente"
                >
                  <ChevronRight size={15} />
                </button>
                {!sameDay(today, day) && (
                  <button
                    onClick={() => setDay(today)}
                    className="rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-bold text-[var(--accent-bright)] hover:bg-[var(--accent-soft)]/80"
                  >
                    Volver a hoy
                  </button>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">
                  En espera vs. asignado — {dayValue.split('-').reverse().join('/')}
                </h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'En Espera', value: enEsperaDia, color: STATUS_COLOR['En Espera'] },
                    { label: 'Asignado', value: asignadoDia, color: STATUS_COLOR['Asignado'] },
                  ].map((s) => (
                    <div key={s.label} className="grid grid-cols-[120px_1fr_36px] items-center gap-3">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">{s.label}</span>
                      <div className="h-4 overflow-hidden rounded bg-[var(--surface-sunken)]">
                        <div
                          className="h-full animate-grow-width rounded"
                          style={{ width: `${(s.value / maxDia) * 100}%`, background: s.color }}
                        />
                      </div>
                      <span className="text-right text-xs tabular-nums text-[var(--text-secondary)]">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">
                  Tendencia de asignaciones por día
                </h3>
                <p className="mb-2 text-[11px] text-[var(--text-muted)]">
                  Histórico completo de este gestor — con los días, lo asignado pasa a finalizado.
                </p>
                <TrendLineChart points={asignacionesPorDia} height={200} emptyMessage="Aún no hay asignaciones registradas." />
              </div>
            </div>
          )}

          {tab === 'Seguimiento' && (
            <div className="space-y-6">
              <p className="text-xs text-[var(--text-muted)]">
                Servicios solicitados antes de hoy que ya deberían estar Finalizado o Cancelado — todo lo de días anteriores debe quedar
                cerrado.
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div className="panel-card rounded-xl p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Pendientes vencidos</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--text)] tabular-nums">{seguimiento.length}</p>
                </div>
                <div className="panel-card rounded-xl p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">% cerrados a tiempo</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--text)] tabular-nums">{pastClosedPct}%</p>
                  <p
                    className={`mt-0.5 text-[11px] font-semibold ${
                      pastClosedPct >= teamClosedPct ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {pastClosedPct >= teamClosedPct ? '▲' : '▼'} {Math.abs(Math.round((pastClosedPct - teamClosedPct) * 10) / 10)} pts vs.
                    equipo
                  </p>
                </div>
                <div className="panel-card rounded-xl p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Promedio del equipo</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--text-secondary)] tabular-nums">{teamClosedPct}%</p>
                </div>
              </div>

              {seguimiento.length === 0 ? (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--accent-soft)] p-4 text-sm font-semibold text-[var(--accent-bright)]">
                  <CheckCircle2 size={18} className="flex-none" />
                  Todo al día — no hay servicios de días anteriores sin cerrar.
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">Antigüedad del atraso</h3>
                    <div className="space-y-2">
                      {antiguedadBuckets.map((b) => (
                        <div key={b.label} className="grid grid-cols-[80px_1fr_28px] items-center gap-3">
                          <span className="text-xs font-medium text-[var(--text-secondary)]">{b.label}</span>
                          <div className="h-3.5 overflow-hidden rounded bg-[var(--surface-sunken)]">
                            {b.count > 0 && (
                              <div
                                className="h-full animate-grow-width rounded"
                                style={{ width: `${(b.count / maxBucket) * 100}%`, background: '#e34948' }}
                              />
                            )}
                          </div>
                          <span className="text-right text-xs tabular-nums text-[var(--text-secondary)]">{b.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">Vencidos por proyecto</h3>
                      <div className="space-y-1.5">
                        {porProyecto.map(([key, count]) => (
                          <div key={key} className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate text-[var(--text-secondary)]">{key}</span>
                            <span className="flex-none font-bold tabular-nums text-[var(--text)]">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">Vencidos por ciudad</h3>
                      <div className="space-y-1.5">
                        {porCiudad.map(([key, count]) => (
                          <div key={key} className="flex items-center justify-between gap-2 text-xs">
                            <span className="truncate text-[var(--text-secondary)]">{key}</span>
                            <span className="flex-none font-bold tabular-nums text-[var(--text)]">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">
                      Sin asignar — {sinAsignar.length}
                    </h3>
                    <p className="mb-2 text-[11px] text-[var(--text-muted)]">Nunca se les asignó mensajero.</p>
                    <SeguimientoTable rows={sinAsignar} />
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">
                      Asignado sin cerrar — {asignadoSinCerrar.length}
                    </h3>
                    <p className="mb-2 text-[11px] text-[var(--text-muted)]">Ya tienen mensajero pero no se les dio cierre.</p>
                    <SeguimientoTable rows={asignadoSinCerrar} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
