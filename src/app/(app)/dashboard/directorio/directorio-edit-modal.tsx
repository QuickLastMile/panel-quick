'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X, Trash2 } from 'lucide-react';
import type { DirectorioEntry } from '@/lib/directorio-types';
import { bogotaToday } from '@/lib/date-filter';
import { saveMensajero, deleteMensajero } from './actions';

const TIPOS_VEHICULO = ['MOTORIZADO', 'CARRY'];

function hoyStr(): string {
  const t = bogotaToday();
  return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
}
const SIN_IDENTIFICAR = 'SIN IDENTIFICAR';

// "BOGOTÁ" vs "BOGOTA" son la misma ciudad — sin esto, un valor viejo
// escrito con tilde (de cuando el campo era texto libre) no calzaba con
// ninguna opción del desplegable (que viene sin tildes, del origen).
const DIACRITICOS = /[̀-ͯ]/g;
function normalizar(s: string): string {
  return s.normalize('NFD').replace(DIACRITICOS, '').toUpperCase().trim();
}

export default function DirectorioEditModal({
  entry,
  proyectos,
  ciudades,
  onClose,
}: {
  entry: DirectorioEntry | null;
  proyectos: string[];
  ciudades: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<DirectorioEntry | null>(entry);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setForm(entry);
    setError('');
    setConfirmingDelete(false);
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

  // Un valor manual viejo escrito con tilde ("BOGOTÁ") calza igual con la
  // opción sin tilde del desplegable ("BOGOTA") — se resuelve solo, sin
  // pedirle a la usuaria que lo vuelva a escribir.
  const vehiculoResuelto = TIPOS_VEHICULO.find((v) => normalizar(v) === normalizar(form.tipoVehiculoManual));
  const vehiculoSelectValue = form.tipoVehiculoManual ? vehiculoResuelto ?? form.tipoVehiculoManual : '';

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

  async function handleDelete() {
    if (!entry) return;
    setDeleting(true);
    setError('');
    const res = await deleteMensajero(entry.identTrabajador);
    setDeleting(false);
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Ciudad (manual)</label>
              <input
                list="ciudades-datalist"
                value={form.ciudadManual}
                onChange={(e) => setForm({ ...form, ciudadManual: e.target.value.toUpperCase() })}
                className={inputCls}
                placeholder="Escriba para buscar…"
              />
              <datalist id="ciudades-datalist">
                {ciudades.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <p className="mt-1 text-[10.5px] text-[var(--text-muted)]">
                Empiece a escribir y elija de las sugerencias — solo hace falta si no se puede calcular sola del historial de servicios
                (ej. vetados de antes de septiembre 2026).
              </p>
            </div>
            <div>
              <label className={labelCls}>Vehículo (manual)</label>
              <select
                value={vehiculoSelectValue}
                onChange={(e) => setForm({ ...form, tipoVehiculoManual: e.target.value })}
                className={inputCls}
              >
                <option value="">— Sin especificar —</option>
                {TIPOS_VEHICULO.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
                {form.tipoVehiculoManual && !vehiculoResuelto && (
                  <option value={form.tipoVehiculoManual}>{form.tipoVehiculoManual} (valor antiguo)</option>
                )}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] p-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
              <input
                type="checkbox"
                checked={form.vetado}
                onChange={(e) => {
                  const nextVetado = e.target.checked;
                  setForm({
                    ...form,
                    vetado: nextVetado,
                    vetadoDesde: nextVetado && !form.vetadoDesde ? hoyStr() : form.vetadoDesde,
                  });
                }}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Vetado
            </label>
            {form.vetado && (
              <div className="mt-3 space-y-4">
                <div>
                  <label className={labelCls}>Vetado desde</label>
                  <input
                    type="date"
                    value={form.vetadoDesde}
                    onChange={(e) => setForm({ ...form, vetadoDesde: e.target.value })}
                    className={`${inputCls} [color-scheme:dark] max-w-[200px]`}
                  />
                  <p className="mt-1 text-[10.5px] text-[var(--text-muted)]">
                    Por defecto hoy — ajústela si el veto en realidad fue antes, para que la alerta de reasignación cuente bien.
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Proyecto(s) donde está vetado — puede marcar más de uno</label>
                  <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] p-2">
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border-b border-[var(--border)] px-1.5 py-1 pb-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">
                      <input
                        type="checkbox"
                        checked={form.vetadoProyectos.includes(SIN_IDENTIFICAR)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            vetadoProyectos: e.target.checked
                              ? [...form.vetadoProyectos, SIN_IDENTIFICAR]
                              : form.vetadoProyectos.filter((x) => x !== SIN_IDENTIFICAR),
                          })
                        }
                        className="h-3.5 w-3.5 accent-[var(--accent)]"
                      />
                      {SIN_IDENTIFICAR} — no se sabe de cuál proyecto exactamente
                    </label>
                    {proyectos.length === 0 ? (
                      <p className="px-1 py-1 text-xs text-[var(--text-muted)]">No hay proyectos activos para elegir.</p>
                    ) : (
                      proyectos.map((p) => (
                        <label key={p} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">
                          <input
                            type="checkbox"
                            checked={form.vetadoProyectos.includes(p)}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                vetadoProyectos: e.target.checked
                                  ? [...form.vetadoProyectos, p]
                                  : form.vetadoProyectos.filter((x) => x !== p),
                              })
                            }
                            className="h-3.5 w-3.5 accent-[var(--accent)]"
                          />
                          {p}
                        </label>
                      ))
                    )}
                    {/* Valores viejos (texto libre, de antes del desplegable) que ya no
                        coinciden con ningún proyecto activo — no aparecen en la lista de
                        arriba, así que sin esto no había forma de desmarcarlos. */}
                    {form.vetadoProyectos
                      .filter((p) => p !== SIN_IDENTIFICAR && !proyectos.includes(p))
                      .map((p) => (
                        <label
                          key={p}
                          className="flex cursor-pointer items-center gap-2 rounded-md border-t border-[var(--border)] px-1.5 py-1 pt-1.5 text-xs text-amber-400 hover:bg-[var(--surface-hover)]"
                        >
                          <input
                            type="checkbox"
                            checked
                            onChange={() => setForm({ ...form, vetadoProyectos: form.vetadoProyectos.filter((x) => x !== p) })}
                            className="h-3.5 w-3.5 accent-amber-500"
                          />
                          {p} (valor antiguo, sin coincidencia — desmárquelo y marque el proyecto correcto de arriba)
                        </label>
                      ))}
                  </div>
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

        <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] p-4">
          {!isNew && (
            <div className="flex items-center gap-2">
              {confirmingDelete ? (
                <>
                  <span className="text-xs font-semibold text-red-400">¿Eliminar toda la novedad de {entry.nombreTrabajador}?</span>
                  <button
                    onClick={handleDelete}
                    type="button"
                    disabled={deleting}
                    className="rounded-lg bg-red-500/20 px-3 py-2 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/30 disabled:opacity-60"
                  >
                    {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    type="button"
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]"
                  >
                    No
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-red-400 transition-colors hover:border-red-900/50 hover:bg-red-500/10"
                >
                  <Trash2 size={13} />
                  Eliminar
                </button>
              )}
            </div>
          )}
          <div className={`flex items-center gap-2 ${isNew ? 'ml-auto' : ''}`}>
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
      </div>
    </>,
    document.body
  );
}
