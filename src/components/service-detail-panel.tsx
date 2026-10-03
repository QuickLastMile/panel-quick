'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ServiceRow } from '@/lib/sheets';
import StatusPill from './status-pill';

function money(v: number | null) {
  if (v === null) return '';
  return `$${v.toLocaleString('es-CO')}`;
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-0.5 text-sm text-[var(--text)]">{value === null || value === '' ? <span className="text-[var(--text-muted)]">—</span> : value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[var(--border)] pt-4 first:border-t-0 first:pt-0">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">{title}</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">{children}</div>
    </div>
  );
}

export default function ServiceDetailPanel({ row, onClose }: { row: ServiceRow | null; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!row) return;
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
  }, [row, onClose]);

  if (!row || !mounted) return null;

  const tieneCancelacion = row.razonCancelacion || row.descCancelacion;
  const asignado = row.nombreTrabajador || row.identTrabajador || row.placa;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 animate-fade-in-up bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl md:inset-x-10 md:inset-y-8 md:mx-auto md:max-w-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">Servicio #{row.id}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <StatusPill status={row.estado} />
              <span className="text-sm font-semibold text-[var(--text)]">{row.proyecto}</span>
            </div>
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
          <Section title="Organización">
            <Field label="Proyecto" value={row.proyecto} />
            <Field label="Gestor" value={row.gestor} />
            <Field label="Jefatura" value={row.jefatura} />
          </Section>

          <Section title="Fechas">
            <Field label="Fecha de solicitud" value={row.fechaSolicitud} />
            <Field label="Fecha de creación" value={row.fechaCreacion} />
            <Field label="Días anticipados de creación" value={row.diasAnticipadosCreacion} />
          </Section>

          <Section title="Ubicación">
            <Field label="Ciudad" value={row.ciudad} />
            <Field label="Zona" value={row.zona} />
            <Field label="Dirección de origen" value={row.direccion} />
          </Section>

          <Section title="Servicio">
            <Field label="Servicio" value={row.servicio} />
            <Field label="Tipo de servicio" value={row.tipoServicio} />
            <Field label="Email solicitante" value={row.email} />
            <div className="col-span-2 sm:col-span-3">
              <Field label="Descripción" value={row.descripcion} />
            </div>
          </Section>

          <Section title="Trabajador asignado">
            <Field label="Nombre trabajador" value={asignado ? row.nombreTrabajador : ''} />
            <Field label="Ident. trabajador" value={asignado ? row.identTrabajador : ''} />
            <Field label="Placa" value={asignado ? row.placa : ''} />
          </Section>

          <Section title="Financiero">
            <Field label="Valor declarado" value={money(row.valorDeclarado)} />
            <Field label="Precio total" value={money(row.precioTotal)} />
            <Field label="Ganancias" value={money(row.ganancias)} />
          </Section>

          {tieneCancelacion && (
            <Section title="Cancelación">
              <Field label="Razón de cancelación" value={row.razonCancelacion} />
              <div className="col-span-2 sm:col-span-2">
                <Field label="Descripción de cancelación" value={row.descCancelacion} />
              </div>
            </Section>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
