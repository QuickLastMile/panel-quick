'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Ban, BadgeCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { DirectorioEntry } from '@/lib/directorio-types';
import { getServiciosDeMensajero } from '@/app/(app)/dashboard/mensajeros/actions';

const TERMINAL = new Set(['Finalizado', 'Cancelado', 'Finalizado Cancelado']);

export default function NovedadPopover({ entry, onClose }: { entry: DirectorioEntry | null; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [activos, setActivos] = useState<{ id: string; proyecto: string; estado: string } [] | null>(null);

  useEffect(() => setMounted(true), []);

  // El detalle de vetado/fijo/notas ya viene en `entry` (del directorio) —
  // lo único que hay que traer bajo demanda es el histórico del mensajero,
  // para ver si tiene asignaciones activas justo en un proyecto del que
  // está vetado.
  useEffect(() => {
    if (!entry) return;
    setActivos(null);
    let cancelled = false;
    getServiciosDeMensajero(entry.identTrabajador).then((rows) => {
      if (cancelled) return;
      setActivos(rows.filter((r) => !TERMINAL.has(r.estado)).map((r) => ({ id: r.id, proyecto: r.proyecto, estado: r.estado })));
    });
    return () => {
      cancelled = true;
    };
  }, [entry]);

  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [entry, onClose]);

  if (!entry || !mounted) return null;

  const violacion = activos ? activos.filter((a) => entry.vetadoProyectos.includes(a.proyecto)) : [];

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 animate-fade-in-up bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">Novedad</p>
            <h2 className="mt-0.5 text-base font-bold text-[var(--text)]">{entry.nombreTrabajador}</h2>
            <p className="text-xs text-[var(--text-muted)]">{entry.identTrabajador}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-none rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--accent-bright)]"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {entry.vetado && (
            <div className="rounded-lg border border-red-900/40 bg-red-950/30 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-red-300">
                <Ban size={13} />
                Vetado {entry.vetadoProyectos.length ? `de ${entry.vetadoProyectos.length} proyecto${entry.vetadoProyectos.length === 1 ? '' : 's'}` : ''}
              </p>
              {entry.vetadoProyectos.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {entry.vetadoProyectos.map((p) => (
                    <span key={p} className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10.5px] font-bold text-red-400">
                      {p}
                    </span>
                  ))}
                </div>
              )}
              {entry.vetadoMotivo && <p className="text-xs text-red-200/90">{entry.vetadoMotivo}</p>}
            </div>
          )}

          {entry.contratadoFijo && (
            <div className="rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent-bright)]">
                <BadgeCheck size={13} />
                Contratado fijo {entry.contratadoFijoProyecto ? `en ${entry.contratadoFijoProyecto}` : ''}
              </p>
            </div>
          )}

          {entry.notas && (
            <div>
              <p className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Notas</p>
              <p className="text-xs text-[var(--text-secondary)]">{entry.notas}</p>
            </div>
          )}

          {entry.vetado && entry.vetadoProyectos.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Asignaciones activas en proyecto vetado
              </p>
              {activos === null ? (
                <p className="text-xs text-[var(--text-muted)]">Verificando…</p>
              ) : violacion.length > 0 ? (
                <div className="rounded-lg border border-red-900/40 bg-red-950/30 p-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-red-300">
                    <AlertTriangle size={13} />
                    Tiene {violacion.length} servicio{violacion.length === 1 ? '' : 's'} activo{violacion.length === 1 ? '' : 's'} en un
                    proyecto del que está vetado — reasignar.
                  </p>
                  <ul className="space-y-0.5 text-xs text-red-200/90">
                    {violacion.map((a) => (
                      <li key={a.id}>
                        {a.id} — {a.proyecto} ({a.estado})
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 size={13} />
                  Sin asignaciones activas en proyectos vetados.
                </p>
              )}
            </div>
          )}

          {!entry.vetado && !entry.contratadoFijo && !entry.notas && (
            <p className="text-xs text-[var(--text-muted)]">Sin novedades registradas.</p>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
