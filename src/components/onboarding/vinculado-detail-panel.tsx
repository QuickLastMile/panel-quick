'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ServiceRow } from '@/lib/sheets';
import type { VinculacionRow } from '@/lib/onboarding';
import { normEstado } from '@/lib/aggregate';
import { STATUS_COLOR } from '@/lib/status-colors';
import StatusPill from '@/components/status-pill';
import ServiceDetailPanel from '@/components/service-detail-panel';

function RowsTable({ rows, onSelect }: { rows: ServiceRow[]; onSelect: (row: ServiceRow) => void }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin servicios registrados.</p>;
  }
  return (
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
          {rows.map((r) => (
            <tr
              key={r.id}
              onClick={() => onSelect(r)}
              className="cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]"
            >
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
  );
}

export default function VinculadoDetailPanel({
  vinculado,
  serviceRows,
  onClose,
}: {
  vinculado: VinculacionRow | null;
  serviceRows: ServiceRow[];
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ServiceRow | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (vinculado) setSelectedRow(null);
  }, [vinculado]);

  useEffect(() => {
    if (!vinculado) return;
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
  }, [vinculado, onClose]);

  // Cruce por IDENTIFICACIÓN (Onboarding) == Ident. Trabajador (Datos_Actuales).
  const servicios = useMemo(() => {
    if (!vinculado) return [];
    const ident = vinculado.identificacion.trim();
    if (!ident) return [];
    return serviceRows
      .filter((r) => r.identTrabajador.trim() === ident)
      .sort((a, b) => b.fechaSolicitud.localeCompare(a.fechaSolicitud));
  }, [serviceRows, vinculado]);

  const stats = useMemo(() => {
    let finalizados = 0;
    let novedad = 0;
    const porProyecto: Record<string, number> = {};
    servicios.forEach((r) => {
      const e = normEstado(r.estado);
      if (e === 'Finalizado') finalizados += 1;
      else if (e === 'Cancelado') novedad += 1;
      if (r.proyecto) porProyecto[r.proyecto] = (porProyecto[r.proyecto] || 0) + 1;
    });
    const proyectoTopEntry = Object.entries(porProyecto).sort((a, b) => b[1] - a[1])[0];
    const resueltos = finalizados + novedad;
    return {
      total: servicios.length,
      finalizados,
      novedad,
      proyectos: Object.keys(porProyecto).sort((a, b) => a.localeCompare(b, 'es')),
      proyectoTop: proyectoTopEntry ? { key: proyectoTopEntry[0], count: proyectoTopEntry[1] } : null,
      efectividadPct: resueltos ? Math.round((finalizados / resueltos) * 1000) / 10 : 0,
    };
  }, [servicios]);

  if (!vinculado || !mounted) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 animate-fade-in-up bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl md:inset-x-8 md:inset-y-6">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">Vinculado</p>
            <h2 className="mt-0.5 text-lg font-bold text-[var(--text)]">{vinculado.nombreCompleto}</h2>
            <p className="text-xs text-[var(--text-muted)]">
              {vinculado.identificacion} · {vinculado.ciudad} · {vinculado.vehiculo} · Agilizador: {vinculado.agilizador}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-none rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--accent-bright)]"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-auto p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="panel-card rounded-xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Servicios acumulados</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text)] tabular-nums">{stats.total}</p>
            </div>
            <div className="panel-card rounded-xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Finalizados</p>
              <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: STATUS_COLOR['Finalizado'] }}>
                {stats.finalizados}
              </p>
            </div>
            <div className="panel-card rounded-xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Novedad / cancelados</p>
              <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: STATUS_COLOR['Cancelado'] }}>
                {stats.novedad}
              </p>
            </div>
            <div className="panel-card rounded-xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Efectividad</p>
              <p className="mt-1 text-2xl font-bold text-[var(--accent-bright)] tabular-nums">{stats.efectividadPct}%</p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">Proyectos</h3>
            {stats.proyectoTop ? (
              <p className="mb-2 text-xs text-[var(--text-secondary)]">
                Donde más colabora: <span className="font-semibold text-[var(--text)]">{stats.proyectoTop.key}</span> (
                {stats.proyectoTop.count})
              </p>
            ) : (
              <p className="mb-2 text-xs text-[var(--text-muted)]">Aún sin servicios.</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {stats.proyectos.map((p) => (
                <span key={p} className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]">
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">
              Servicios realizados ({servicios.length})
            </h3>
            <RowsTable rows={servicios} onSelect={setSelectedRow} />
          </div>
        </div>
      </div>
      <ServiceDetailPanel row={selectedRow} onClose={() => setSelectedRow(null)} />
    </>,
    document.body
  );
}
