'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import type { DirectorioEntry } from '@/lib/directorio-types';
import { saveMensajero } from './actions';

export default function DirectorioEditModal({ entry, onClose }: { entry: DirectorioEntry | null; onClose: () => void }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<DirectorioEntry | null>(entry);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setForm(entry);
    setError('');
  }, [entry]);

  useEffect(() => {
    if (!entry) return;
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
  }, [entry, onClose]);

  if (!entry || !form || !mounted) return null;

  const isNew = !entry.identTrabajador;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.identTrabajador.trim() || !form.nombreTrabajador.trim()) {
      setError('Nombre e identificación son obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
    const res = await saveMensajero(form);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
    onClose();
  }

  const inputCls =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]';
  const labelCls = 'mb-1 block text-xs font-semibold text-[var(--text-secondary)]';

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 animate-fade-in-up bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl md:inset-x-10 md:inset-y-10 md:mx-auto md:max-w-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
          <h2 className="text-sm font-bold text-[var(--text)]">{isNew ? 'Agregar novedad' : `Editar — ${entry.nombreTrabajador}`}</h2>
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--accent-bright)]"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-auto p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Identificación *</label>
              <input
                value={form.identTrabajador}
                onChange={(e) => setForm({ ...form, identTrabajador: e.target.value })}
                disabled={!isNew}
                className={`${inputCls} ${!isNew ? 'opacity-60' : ''}`}
                placeholder="Cédula / documento"
              />
            </div>
            <div>
              <label className={labelCls}>Nombre *</label>
              <input
                value={form.nombreTrabajador}
                onChange={(e) => setForm({ ...form, nombreTrabajador: e.target.value })}
                className={inputCls}
                placeholder="Nombre completo"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Teléfono</label>
              <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className={inputCls}
                placeholder="300 000 0000"
              />
            </div>
            <div>
              <label className={labelCls}>Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as 'Activo' | 'Inactivo' })}
                className={inputCls}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] p-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
              <input
                type="checkbox"
                checked={form.vetado}
                onChange={(e) => setForm({ ...form, vetado: e.target.checked })}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Vetado
            </label>
            {form.vetado && (
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Proyecto donde está vetado</label>
                  <input
                    value={form.vetadoProyecto}
                    onChange={(e) => setForm({ ...form, vetadoProyecto: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Motivo</label>
                  <input
                    value={form.vetadoMotivo}
                    onChange={(e) => setForm({ ...form, vetadoMotivo: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-[var(--border)] p-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
              <input
                type="checkbox"
                checked={form.contratadoFijo}
                onChange={(e) => setForm({ ...form, contratadoFijo: e.target.checked })}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Contratado fijo en una operación
            </label>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Si se marca, Novedades avisará si este mensajero aparece activo en cualquier otro proyecto.
            </p>
            {form.contratadoFijo && (
              <div className="mt-3">
                <label className={labelCls}>Proyecto / operación fija</label>
                <input
                  value={form.contratadoFijoProyecto}
                  onChange={(e) => setForm({ ...form, contratadoFijoProyecto: e.target.value })}
                  className={inputCls}
                />
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Notas</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              className={`${inputCls} min-h-20 resize-y`}
            />
          </div>

          {error && <p className="rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
        </form>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] p-4">
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-gradient-gold px-4 py-2 text-sm font-bold text-[#141008] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
