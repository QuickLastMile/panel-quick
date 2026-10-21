'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ServiceRow } from '@/lib/sheets';
import { STATUS_COLOR } from '@/lib/status-colors';
import StatusPill from './status-pill';
import RankingBarList from './charts/ranking-bar-list';
import ServiceDetailPanel from './service-detail-panel';
import { getServiciosDeMensajero } from '@/app/(app)/dashboard/mensajeros/actions';

export type MensajeroDetailTarget = {
  identTrabajador: string;
  nombreTrabajador: string;
  tipoVehiculo: string;
  proyectoTop: string;
  total: number;
  finalizado: number;
  cancelado: number;
  diasActivos: number;
  tasaCumplimiento: number;
};

function RowsTable({ rows, onSelect }: { rows: ServiceRow[]; onSelect: (row: ServiceRow) => void }) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-[var(--text-muted)]">Sin servicios.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
      <table className="w-full min-w-[680px] border-collapse text-xs">
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

export default function MensajeroDetailPanel({ target, onClose }: { target: MensajeroDetailTarget | null; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ServiceRow | null>(null);

  useEffect(() => setMounted(true), []);

  // Todo el histórico de este mensajero (todos los IDs que ha realizado),
  // no acotado por el filtro de fecha de la tabla — igual que
  // GestorDetailPanel, se trae bajo demanda al abrir.
  useEffect(() => {
    if (!target) return;
    setRows([]);
    setLoading(true);
    let cancelled = false;
    getServiciosDeMensajero(target.identTrabajador)
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [target]);

  useEffect(() => {
    if (!target) return;
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
  }, [target, onClose]);

  // Entregas (Finalizado) por proyecto — a qué proyectos le ha cumplido más.
  const entregasPorProyecto = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      if (r.estado !== 'Finalizado' || !r.proyecto) return;
      map[r.proyecto] = (map[r.proyecto] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([key, count]) => ({ key, count }));
  }, [rows]);

  const rowsOrdenadas = useMemo(
    () => [...rows].sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion)),
    [rows]
  );

  if (!target || !mounted) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 animate-fade-in-up bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl md:inset-x-8 md:inset-y-6">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">Mensajero</p>
            <h2 className="mt-0.5 text-lg font-bold text-[var(--text)]">{target.nombreTrabajador}</h2>
            <p className="text-xs text-[var(--text-muted)]">
              {target.identTrabajador}
              {target.tipoVehiculo ? ` · ${target.tipoVehiculo}` : ''}
              {target.proyectoTop ? ` · Principal: ${target.proyectoTop}` : ''}
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

        <div className="flex-1 overflow-auto p-5">
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="panel-card rounded-xl p-3">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Total</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-[var(--text)]">{target.total.toLocaleString('es-CO')}</p>
            </div>
            <div className="panel-card rounded-xl p-3">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Finalizados</p>
              <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: STATUS_COLOR['Finalizado'] }}>
                {target.finalizado.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="panel-card rounded-xl p-3">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Cancelados</p>
              <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: STATUS_COLOR['Cancelado'] }}>
                {target.cancelado.toLocaleString('es-CO')}
              </p>
            </div>
            <div className="panel-card rounded-xl p-3">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">% Cumplimiento</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-[var(--text)]">{Math.round(target.tasaCumplimiento * 100)}%</p>
            </div>
            <div className="panel-card rounded-xl p-3">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Días activo</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-[var(--text)]">{target.diasActivos}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">Entregas por proyecto</h3>
            <p className="mb-2 text-[11px] text-[var(--text-muted)]">
              Cantidad de servicios finalizados por proyecto — todo el histórico de este mensajero.
            </p>
            {loading ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">Cargando…</p>
            ) : entregasPorProyecto.length ? (
              <RankingBarList items={entregasPorProyecto} />
            ) : (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin entregas finalizadas todavía.</p>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">
              Todos los servicios — {rows.length.toLocaleString('es-CO')}
            </h3>
            {loading ? <p className="py-10 text-center text-sm text-[var(--text-muted)]">Cargando…</p> : <RowsTable rows={rowsOrdenadas} onSelect={setSelectedRow} />}
          </div>
        </div>
      </div>
      <ServiceDetailPanel row={selectedRow} onClose={() => setSelectedRow(null)} />
    </>,
    document.body
  );
}
