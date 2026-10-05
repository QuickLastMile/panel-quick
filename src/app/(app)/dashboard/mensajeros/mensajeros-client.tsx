'use client';

import { useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ShieldCheck, Medal, Award, ChevronDown, ChevronUp, Ban, BadgeCheck, FileWarning, Flag } from 'lucide-react';
import type { MensajeroStat } from '@/lib/aggregate';
import { STATUS_COLOR } from '@/lib/status-colors';
import type { DirectorioEntry } from '@/lib/directorio-types';
import { emptyDirectorioEntry } from '@/lib/directorio-types';
import ChartCard from '@/components/charts/chart-card';
import RankingBarList from '@/components/charts/ranking-bar-list';
import DirectorioEditModal from '../directorio/directorio-edit-modal';

const EN_PROCESO_COLOR = STATUS_COLOR['Asignado'];

function tier(score: number): { label: string; fg: string; bg: string } {
  if (score >= 75) return { label: 'Núcleo fiel', fg: '#d6a419', bg: 'rgba(214,164,25,0.15)' };
  if (score >= 50) return { label: 'Confiable', fg: '#4f9df5', bg: 'rgba(79,157,245,0.15)' };
  return { label: 'Por construir confianza', fg: '#8a8a8a', bg: 'rgba(138,138,138,0.15)' };
}

function rankBadge(i: number) {
  if (i === 0) return { icon: Medal, color: '#d6a419' };
  if (i === 1) return { icon: Medal, color: '#c7c7c7' };
  if (i === 2) return { icon: Medal, color: '#b9772f' };
  return null;
}

function MensajeroCard({
  s,
  rank,
  dirEntry,
  canEditDirectorio,
  onOpenRegistro,
}: {
  s: MensajeroStat;
  rank: number;
  dirEntry?: DirectorioEntry;
  canEditDirectorio: boolean;
  onOpenRegistro: () => void;
}) {
  const t = tier(s.indiceFidelidad);
  const badge = rankBadge(rank);
  const BadgeIcon = badge?.icon;
  const hasNovedad = !!dirEntry && dirEntry.notas.trim() !== '' && !dirEntry.vetado;

  return (
    <div
      onClick={canEditDirectorio ? onOpenRegistro : undefined}
      className={`panel-card flex flex-col gap-3 rounded-xl p-4 ${
        canEditDirectorio ? 'cursor-pointer transition-colors hover:border-[var(--border-strong)]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--surface-sunken)] text-xs font-bold text-[var(--text-secondary)]">
            {BadgeIcon ? <BadgeIcon size={16} color={badge.color} /> : `#${rank + 1}`}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--text)]">{s.nombreTrabajador}</p>
            <p className="truncate text-[10.5px] text-[var(--text-muted)]">{s.identTrabajador}</p>
          </div>
        </div>
        <span
          className="flex-none rounded-full px-2 py-1 text-[10px] font-bold whitespace-nowrap"
          style={{ background: t.bg, color: t.fg }}
        >
          {t.label}
        </span>
      </div>

      {dirEntry && (dirEntry.vetado || dirEntry.contratadoFijo || hasNovedad) && (
        <div className="flex flex-wrap gap-1.5">
          {dirEntry.vetado && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
              <Ban size={10} />
              Vetado{dirEntry.vetadoProyecto ? ` — ${dirEntry.vetadoProyecto}` : ''}
            </span>
          )}
          {dirEntry.contratadoFijo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-bright)]">
              <BadgeCheck size={10} />
              Fijo{dirEntry.contratadoFijoProyecto ? ` — ${dirEntry.contratadoFijoProyecto}` : ''}
            </span>
          )}
          {hasNovedad && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
              <FileWarning size={10} />
              Novedad
            </span>
          )}
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
          <span>Índice de fidelidad</span>
          <span className="tabular-nums text-[var(--text)]">{s.indiceFidelidad}/100</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
          <div
            className="h-full animate-grow-width rounded-full"
            style={{ width: `${s.indiceFidelidad}%`, background: t.fg }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-[var(--surface-sunken)] p-2">
          <p className="text-sm font-bold tabular-nums text-[var(--text)]">{s.diasActivos}</p>
          <p className="text-[9.5px] uppercase tracking-wide text-[var(--text-muted)]">Días activo</p>
        </div>
        <div className="rounded-lg bg-[var(--surface-sunken)] p-2">
          <p className="text-sm font-bold tabular-nums" style={{ color: STATUS_COLOR['Finalizado'] }}>
            {Math.round(s.tasaCumplimiento * 100)}%
          </p>
          <p className="text-[9.5px] uppercase tracking-wide text-[var(--text-muted)]">Cumplimiento</p>
        </div>
        <div className="rounded-lg bg-[var(--surface-sunken)] p-2">
          <p className="text-sm font-bold tabular-nums text-[var(--text)]">{s.finalizado}</p>
          <p className="text-[9.5px] uppercase tracking-wide text-[var(--text-muted)]">Finalizados</p>
        </div>
      </div>

      {s.proyectos.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {s.proyectos.slice(0, 3).map((p) => (
            <span
              key={p}
              className="truncate rounded-full border border-[var(--border)] px-2 py-0.5 text-[9.5px] font-semibold text-[var(--text-secondary)]"
              style={{ maxWidth: 120 }}
            >
              {p}
            </span>
          ))}
          {s.proyectos.length > 3 && (
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[9.5px] font-semibold text-[var(--text-muted)]">
              +{s.proyectos.length - 3}
            </span>
          )}
        </div>
      )}

      {canEditDirectorio && (
        <p className="flex items-center gap-1 text-[10px] font-semibold text-[var(--text-muted)]">
          <Flag size={10} />
          {dirEntry ? 'Ver / editar registro en Novedades' : 'Registrar vetado o novedad'}
        </p>
      )}
    </div>
  );
}

export default function MensajerosClient({
  stats,
  proyectos,
  proyectoParam,
  directorio,
  canEditDirectorio,
}: {
  stats: MensajeroStat[];
  proyectos: string[];
  proyectoParam: string;
  directorio: DirectorioEntry[];
  canEditDirectorio: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showVolumen, setShowVolumen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DirectorioEntry | null>(null);

  const dirMap = useMemo(() => new Map(directorio.map((d) => [d.identTrabajador, d])), [directorio]);
  const top = stats[0];

  function setProyecto(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('proyecto', value);
    else params.delete('proyecto');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-2.5">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Proyecto</span>
          <select
            value={proyectoParam}
            onChange={(e) => setProyecto(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
          >
            <option value="">Todos</option>
            {proyectos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        {proyectoParam && (
          <button onClick={() => setProyecto('')} className="text-xs font-semibold text-[var(--accent-bright)] hover:underline">
            Limpiar filtro
          </button>
        )}
      </div>

      {top && (
        <div className="panel-card mb-5 flex items-center gap-4 rounded-xl border-[var(--accent)] p-5">
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gradient-gold text-[#141008] shadow-[0_0_18px_rgba(214,164,25,0.25)]">
            <ShieldCheck size={22} />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--accent-bright)]">
              {proyectoParam ? `Más fiel en ${proyectoParam}` : 'Más fiel y juicioso — todos los proyectos'}
            </p>
            <p className="text-lg font-bold text-[var(--text)]">{top.nombreTrabajador}</p>
            <p className="text-xs text-[var(--text-muted)]">
              Índice {top.indiceFidelidad}/100 · {top.diasActivos} día{top.diasActivos === 1 ? '' : 's'} activo ·{' '}
              {Math.round(top.tasaCumplimiento * 100)}% cumplimiento
            </p>
          </div>
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <Award size={15} className="text-[var(--accent-bright)]" />
        <h2 className="text-sm font-bold text-[var(--text)]">Mensajeros más fieles y juiciosos</h2>
      </div>

      {stats.length ? (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.slice(0, 12).map((s, i) => (
            <MensajeroCard
              key={s.identTrabajador}
              s={s}
              rank={i}
              dirEntry={dirMap.get(s.identTrabajador)}
              canEditDirectorio={canEditDirectorio}
              onOpenRegistro={() =>
                setEditingEntry(dirMap.get(s.identTrabajador) || emptyDirectorioEntry(s.identTrabajador, s.nombreTrabajador))
              }
            />
          ))}
        </div>
      ) : (
        <p className="mb-6 py-8 text-center text-sm text-[var(--text-muted)]">Sin mensajeros asignados para este filtro.</p>
      )}

      <button
        onClick={() => setShowVolumen((v) => !v)}
        className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-bright)]"
      >
        {showVolumen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {showVolumen ? 'Ocultar' : 'Ver'} ranking por volumen y detalle completo
      </button>

      {showVolumen && (
        <>
          <ChartCard title="Ranking por volumen" description="Por servicios finalizados — top 14 (sin ajustar por constancia)" className="mb-5">
            {stats.length ? (
              <RankingBarList
                items={[...stats]
                  .sort((a, b) => b.finalizado - a.finalizado)
                  .slice(0, 14)
                  .map((s) => ({ key: s.nombreTrabajador, count: s.finalizado }))}
              />
            ) : (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin mensajeros asignados para este filtro.</p>
            )}
          </ChartCard>

          <ChartCard title="Detalle por mensajero" description="Total gestionado, constancia y desglose por estado">
            {stats.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-xs">
                  <thead>
                    <tr>
                      {['Mensajero', 'Identificación', 'Índice', 'Días activo', 'Total', 'Finalizado', 'Cancelado', 'En proceso'].map(
                        (h) => (
                          <th
                            key={h}
                            className="border-b border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((s) => (
                      <tr key={s.identTrabajador} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]">
                        <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[var(--text)]">{s.nombreTrabajador}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{s.identTrabajador}</td>
                        <td className="px-3 py-2.5 tabular-nums font-semibold text-[var(--accent-bright)]">{s.indiceFidelidad}</td>
                        <td className="px-3 py-2.5 tabular-nums text-[var(--text-secondary)]">{s.diasActivos}</td>
                        <td className="px-3 py-2.5 tabular-nums text-[var(--text-secondary)]">{s.total.toLocaleString('es-CO')}</td>
                        <td className="px-3 py-2.5 tabular-nums font-semibold" style={{ color: STATUS_COLOR['Finalizado'] }}>
                          {s.finalizado.toLocaleString('es-CO')}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums font-semibold" style={{ color: STATUS_COLOR['Cancelado'] }}>
                          {s.cancelado.toLocaleString('es-CO')}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums font-semibold" style={{ color: EN_PROCESO_COLOR }}>
                          {s.enProceso.toLocaleString('es-CO')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin mensajeros asignados para este filtro.</p>
            )}
          </ChartCard>
        </>
      )}

      {canEditDirectorio && <DirectorioEditModal entry={editingEntry} onClose={() => setEditingEntry(null)} />}
    </div>
  );
}
