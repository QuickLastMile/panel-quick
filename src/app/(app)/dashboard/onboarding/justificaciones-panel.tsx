import type { JustificacionEntry } from '@/lib/colaboradores';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

export type AlertadoRow = { id: number; nombreCompleto: string; diasSinServicio: number };

function formatFechaLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

// Sección de la pestaña Onboarding: qué colaboradores con 5+ días sin
// gestión ya tienen una justificación escrita por el encargado HOY, cuáles
// no, y el historial completo de justificaciones agrupado por el día en que
// se escribieron (no el día que justifican — ver getJustificacionesHistorial).
export default function JustificacionesPanel({
  alertados,
  justificaciones,
  hoy,
}: {
  alertados: AlertadoRow[];
  justificaciones: JustificacionEntry[];
  hoy: string;
}) {
  const justificadosHoyIds = new Set(justificaciones.filter((j) => j.fecha === hoy).map((j) => j.colaboradorId));
  const justificadosHoy = alertados.filter((a) => justificadosHoyIds.has(a.id));
  const sinJustificar = alertados.filter((a) => !justificadosHoyIds.has(a.id));

  const porDia = new Map<string, JustificacionEntry[]>();
  justificaciones.forEach((j) => {
    const list = porDia.get(j.fecha) || [];
    list.push(j);
    porDia.set(j.fecha, list);
  });
  const dias = Array.from(porDia.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="panel-card mt-5 rounded-xl p-5">
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">Justificaciones</p>
      <p className="mb-4 text-[11px] text-[var(--text-muted)]">
        Colaboradores con 5 o más días sin gestión — quién ya tiene una observación escrita hoy por el encargado y quién sigue sin
        justificar. Abajo, el historial completo de justificaciones por día.
      </p>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] p-3.5">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-400">
            <CheckCircle2 size={13} /> Justificado hoy ({justificadosHoy.length})
          </p>
          {justificadosHoy.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">Nadie todavía.</p>
          ) : (
            <ul className="space-y-1">
              {justificadosHoy.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-xs text-[var(--text)]">
                  <span>{a.nombreCompleto}</span>
                  <span className="text-[var(--text-muted)]">{a.diasSinServicio}d</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-3.5">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-400">
            <AlertTriangle size={13} /> Sin justificar ({sinJustificar.length})
          </p>
          {sinJustificar.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">Todos justificados.</p>
          ) : (
            <ul className="space-y-1">
              {sinJustificar.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-xs text-[var(--text)]">
                  <span>{a.nombreCompleto}</span>
                  <span className="text-[var(--text-muted)]">{a.diasSinServicio}d</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Historial por día</p>
      {dias.length === 0 ? (
        <p className="py-6 text-center text-xs text-[var(--text-muted)]">Aún no se ha escrito ninguna justificación.</p>
      ) : (
        <div className="space-y-4">
          {dias.map((dia) => (
            <div key={dia}>
              <p className="mb-1.5 text-xs font-bold text-[var(--accent-bright)]">
                {formatFechaLabel(dia)} <span className="font-normal text-[var(--text-muted)]">({porDia.get(dia)!.length})</span>
              </p>
              <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full min-w-[640px] text-xs">
                  <tbody>
                    {porDia.get(dia)!.map((j) => (
                      <tr key={j.id} className="border-b border-[var(--border)] last:border-b-0">
                        <td className="whitespace-nowrap px-3 py-2 font-semibold text-[var(--text)]">{j.nombreCompleto}</td>
                        <td className="px-3 py-2 text-[var(--text-secondary)]">{j.texto}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-[var(--text-muted)]">{j.usuario}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
