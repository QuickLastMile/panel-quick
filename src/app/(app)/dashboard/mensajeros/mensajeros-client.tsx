'use client';

import { useMemo, useState } from 'react';
import { Flag, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import type { MensajeroStat } from '@/lib/aggregate';
import { STATUS_COLOR } from '@/lib/status-colors';
import type { DirectorioEntry } from '@/lib/directorio-types';
import MensajeroDetailPanel, { type MensajeroDetailTarget } from '@/components/mensajero-detail-panel';
import NovedadPopover from '@/components/novedad-popover';

const PAGE_SIZE = 50;

export default function MensajerosClient({
  stats,
  directorio,
  violatingIds,
}: {
  stats: MensajeroStat[];
  directorio: DirectorioEntry[];
  violatingIds: string[];
}) {
  const [selected, setSelected] = useState<MensajeroDetailTarget | null>(null);
  const [novedadEntry, setNovedadEntry] = useState<DirectorioEntry | null>(null);
  const [showAll, setShowAll] = useState(false);

  const dirMap = useMemo(() => new Map(directorio.map((d) => [d.identTrabajador, d])), [directorio]);
  const violatingSet = useMemo(() => new Set(violatingIds), [violatingIds]);

  // Ordenado por cantidad de entregas (finalizados) — lo que pidió el
  // gerente, no por el índice de fidelidad (constancia + cumplimiento).
  const ordenados = useMemo(() => [...stats].sort((a, b) => b.finalizado - a.finalizado), [stats]);
  // Con el filtro en "todos los proyectos" esto puede pasar de 400 filas —
  // renderizar la tabla completa en cada cambio de filtro se sentía lento.
  // Por defecto se muestran las primeras 50 (ya es el ranking ordenado, lo
  // que más importa está arriba) con un botón para ver el resto.
  const visibles = showAll ? ordenados : ordenados.slice(0, PAGE_SIZE);

  return (
    <div>
      {ordenados.length ? (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[920px] border-collapse text-xs">
            <thead>
              <tr>
                {[
                  'Mensajero',
                  'Cédula',
                  'Vehículo',
                  'Proyecto principal',
                  'Total',
                  'Finalizados',
                  'Cancelados',
                  '% Cumplimiento',
                  'Días activo',
                ].map((h) => (
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
              {visibles.map((s, i) => {
                const dirEntry = dirMap.get(s.identTrabajador);
                return (
                  <tr
                    key={s.identTrabajador}
                    onClick={() =>
                      setSelected({
                        identTrabajador: s.identTrabajador,
                        nombreTrabajador: s.nombreTrabajador,
                        tipoVehiculo: s.tipoVehiculo,
                        proyectoTop: s.proyectoTop,
                        total: s.total,
                        finalizado: s.finalizado,
                        cancelado: s.cancelado,
                        diasActivos: s.diasActivos,
                        tasaCumplimiento: s.tasaCumplimiento,
                      })
                    }
                    className="cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[var(--text)]">
                      <span className="flex items-center gap-1.5">
                        #{i + 1} {s.nombreTrabajador}
                        {dirEntry?.vetado && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNovedadEntry(dirEntry);
                            }}
                            title={
                              violatingSet.has(s.identTrabajador)
                                ? 'Vetado — tiene una asignación activa en un proyecto del que está vetado. Clic para ver el detalle.'
                                : 'Vetado — clic para ver el detalle.'
                            }
                            className={`flex-none rounded-full p-0.5 transition-colors hover:bg-red-500/20 ${
                              violatingSet.has(s.identTrabajador) ? 'animate-pulse' : ''
                            }`}
                          >
                            {violatingSet.has(s.identTrabajador) ? (
                              <AlertTriangle size={12} className="text-red-400" />
                            ) : (
                              <Flag size={11} className="text-red-400" />
                            )}
                          </button>
                        )}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{s.identTrabajador}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{s.tipoVehiculo || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{s.proyectoTop || '—'}</td>
                    <td className="px-3 py-2.5 tabular-nums text-[var(--text-secondary)]">{s.total.toLocaleString('es-CO')}</td>
                    <td className="px-3 py-2.5 tabular-nums font-semibold" style={{ color: STATUS_COLOR['Finalizado'] }}>
                      {s.finalizado.toLocaleString('es-CO')}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums font-semibold" style={{ color: STATUS_COLOR['Cancelado'] }}>
                      {s.cancelado.toLocaleString('es-CO')}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums font-semibold text-[var(--accent-bright)]">
                      {Math.round(s.tasaCumplimiento * 100)}%
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-[var(--text-secondary)]">{s.diasActivos}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-[var(--text-muted)]">Sin mensajeros asignados para este filtro.</p>
      )}

      {ordenados.length > PAGE_SIZE && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-bright)]"
        >
          {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showAll ? 'Ver menos' : `Ver los ${ordenados.length.toLocaleString('es-CO')} mensajeros`}
        </button>
      )}

      <MensajeroDetailPanel target={selected} onClose={() => setSelected(null)} />
      <NovedadPopover entry={novedadEntry} onClose={() => setNovedadEntry(null)} />
    </div>
  );
}
