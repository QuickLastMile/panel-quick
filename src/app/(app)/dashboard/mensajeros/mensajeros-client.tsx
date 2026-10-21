'use client';

import { useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Flag } from 'lucide-react';
import type { MensajeroStat } from '@/lib/aggregate';
import { STATUS_COLOR } from '@/lib/status-colors';
import type { DirectorioEntry } from '@/lib/directorio-types';
import MensajeroDetailPanel, { type MensajeroDetailTarget } from '@/components/mensajero-detail-panel';

export default function MensajerosClient({
  stats,
  proyectos,
  proyectoParam,
  directorio,
}: {
  stats: MensajeroStat[];
  proyectos: string[];
  proyectoParam: string;
  directorio: DirectorioEntry[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<MensajeroDetailTarget | null>(null);

  const dirMap = useMemo(() => new Map(directorio.map((d) => [d.identTrabajador, d])), [directorio]);

  // Ordenado por cantidad de entregas (finalizados) — lo que pidió el
  // gerente, no por el índice de fidelidad (constancia + cumplimiento).
  const ordenados = useMemo(() => [...stats].sort((a, b) => b.finalizado - a.finalizado), [stats]);

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
              {ordenados.map((s, i) => {
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
                        {dirEntry?.vetado && <Flag size={11} className="text-red-400" />}
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

      <MensajeroDetailPanel target={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
