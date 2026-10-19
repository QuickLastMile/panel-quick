'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Plus, X, AlertTriangle, History, ShieldOff, ShieldCheck, MessageSquarePlus, Copy, ExternalLink, Check } from 'lucide-react';
import type { ColaboradorRow, ColaboradorInput, ColaboradorHistorialEntry } from '@/lib/colaboradores';
import { TIPOS_IDENTIFICACION, TIPOS_VEHICULO, MEDIOS_VINCULACION, CIUDADES_COLOMBIA } from '@/lib/colaboradores-constants';
import type { ServiceRow } from '@/lib/sheets';
import { getServiciosDeVinculado } from '../actions';
import {
  createColaboradorAction,
  updateColaboradorAction,
  setColaboradorEstadoAction,
  setColaboradorObservacionAction,
  getColaboradorHistorialAction,
} from './actions';

type Row = ColaboradorRow & { diasSinServicio: number | null };

const inputCls =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]';
const labelCls = 'mb-1 block text-xs font-semibold text-[var(--text-secondary)]';
const ALERT_DIAS = 5;
const up = (s: string) => s.toUpperCase();

const REGISTRO_PUBLICO_PATH = '/registro-colaborador';

// Colores de fila según estado del colaborador:
// rojo = inactivo · naranja = alerta (5+ días sin gestión) · verde = ya
// gestiona (y no está en alerta) · azul = activo, nuevo, aún sin gestionar.
function rowTint(r: Row): string {
  if (r.estado === 'INACTIVO') return 'bg-red-500/[0.06] hover:bg-red-500/[0.1]';
  if (r.diasSinServicio !== null && r.diasSinServicio >= ALERT_DIAS) return 'bg-amber-500/[0.07] hover:bg-amber-500/[0.12]';
  if (r.totalGestiones > 0) return 'bg-emerald-500/[0.06] hover:bg-emerald-500/[0.1]';
  return 'bg-sky-500/[0.06] hover:bg-sky-500/[0.1]';
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!mounted) return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-40 animate-fade-in-up bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`fixed inset-x-4 top-1/2 z-50 mx-auto -translate-y-1/2 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl ${
          wide ? 'max-w-2xl' : 'max-w-md'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
          <h2 className="text-sm font-bold text-[var(--text)]">{title}</h2>
          <button onClick={onClose} type="button" className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--accent-bright)]">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </>,
    document.body
  );
}

function emptyInput(): ColaboradorInput {
  return {
    nombreCompleto: '',
    tipoIdentificacion: 'CC',
    identificacion: '',
    fechaVinculacion: new Date().toISOString().slice(0, 10),
    ciudad: '',
    telefono: '',
    telefonoEmergencia: '',
    fechaNacimiento: '',
    placa: '',
    tipoVehiculo: 'MOTO',
    medioVinculacion: 'REFERIDO',
    agilizador: '',
  };
}

function toInput(r: Row): ColaboradorInput {
  return {
    nombreCompleto: r.nombreCompleto,
    tipoIdentificacion: r.tipoIdentificacion || 'CC',
    identificacion: r.identificacion,
    fechaVinculacion: r.fechaVinculacion || '',
    ciudad: r.ciudad,
    telefono: r.telefono,
    telefonoEmergencia: r.telefonoEmergencia,
    fechaNacimiento: r.fechaNacimiento || '',
    placa: r.placa,
    tipoVehiculo: r.tipoVehiculo || 'Moto',
    medioVinculacion: r.medioVinculacion || 'Referido',
    agilizador: r.agilizador,
  };
}

function ComboInput({ id, value, onChange, options, placeholder }: { id: string; value: string; onChange: (v: string) => void; options: readonly string[]; placeholder?: string }) {
  return (
    <>
      <input value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} placeholder={placeholder} list={id} autoComplete="off" />
      <datalist id={id}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  );
}

function ColaboradorForm({ initial, id, onClose }: { initial: Partial<ColaboradorInput>; id?: number; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState<ColaboradorInput>({ ...emptyInput(), ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof ColaboradorInput>(k: K, v: ColaboradorInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const sinPlaca = ['A PIE', 'AUXILIAR', 'BICI'].includes(form.tipoVehiculo.toUpperCase());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombreCompleto.trim()) return setError('El nombre completo es obligatorio.');
    if (!form.identificacion.trim()) return setError('La identificación es obligatoria.');
    setSaving(true);
    setError('');
    const res = id ? await updateColaboradorAction(id, form) : await createColaboradorAction(form);
    setSaving(false);
    if (res.error) return setError(res.error);
    router.refresh();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Nombre completo *</label>
          <input value={form.nombreCompleto} onChange={(e) => set('nombreCompleto', up(e.target.value))} className={inputCls} placeholder="Nombre y apellidos" />
        </div>
        <div>
          <label className={labelCls}>Tipo de identificación</label>
          <select value={form.tipoIdentificacion} onChange={(e) => set('tipoIdentificacion', e.target.value)} className={inputCls}>
            {TIPOS_IDENTIFICACION.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Identificación *</label>
          <input
            value={form.identificacion}
            onChange={(e) => set('identificacion', e.target.value.replace(/[^0-9A-Za-z]/g, ''))}
            className={inputCls}
            placeholder="Sin puntos ni espacios"
            disabled={!!id}
          />
        </div>
        <div>
          <label className={labelCls}>Fecha de vinculación</label>
          <input type="date" value={form.fechaVinculacion} onChange={(e) => set('fechaVinculacion', e.target.value)} className={`${inputCls} [color-scheme:dark]`} />
        </div>
        <div>
          <label className={labelCls}>Fecha de nacimiento</label>
          <input type="date" value={form.fechaNacimiento} onChange={(e) => set('fechaNacimiento', e.target.value)} className={`${inputCls} [color-scheme:dark]`} />
        </div>
        <div>
          <label className={labelCls}>Ciudad</label>
          <ComboInput id="ciudades-list" value={form.ciudad} onChange={(v) => set('ciudad', up(v))} options={CIUDADES_COLOMBIA} placeholder="Elige o escribe una ciudad" />
        </div>
        <div>
          <label className={labelCls}>Teléfono</label>
          <input value={form.telefono} onChange={(e) => set('telefono', e.target.value.replace(/[^0-9]/g, ''))} className={inputCls} placeholder="Sin puntos ni espacios" />
        </div>
        <div>
          <label className={labelCls}>Teléfono de emergencia</label>
          <input value={form.telefonoEmergencia} onChange={(e) => set('telefonoEmergencia', e.target.value.replace(/[^0-9]/g, ''))} className={inputCls} placeholder="Sin puntos ni espacios" />
        </div>
        <div>
          <label className={labelCls}>Tipo de vehículo</label>
          <select value={form.tipoVehiculo} onChange={(e) => set('tipoVehiculo', e.target.value)} className={inputCls}>
            {TIPOS_VEHICULO.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Placa {sinPlaca && <span className="font-normal normal-case text-[var(--text-muted)]">(N/A para {form.tipoVehiculo})</span>}</label>
          <input
            value={sinPlaca ? 'N/A' : form.placa}
            onChange={(e) => set('placa', e.target.value.toUpperCase())}
            className={inputCls}
            placeholder="Ej. ABC12D"
            disabled={sinPlaca}
          />
        </div>
        <div>
          <label className={labelCls}>Medio de vinculación</label>
          <select value={form.medioVinculacion} onChange={(e) => set('medioVinculacion', e.target.value)} className={inputCls}>
            {MEDIOS_VINCULACION.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        {/* Al crear, el agilizador queda anclado automáticamente a quien está
            creando el registro — solo se puede corregir manualmente al
            editar (ej. si lo registró alguien más por encargo). */}
        {id && (
          <div>
            <label className={labelCls}>Agilizador (quién vinculó)</label>
            <input value={form.agilizador} onChange={(e) => set('agilizador', up(e.target.value))} className={inputCls} placeholder="Nombre del agilizador" />
          </div>
        )}
      </div>
      {error && <p className="rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onClose} type="button" className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-gradient-gold px-4 py-2 text-sm font-bold text-[#141008] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

function InactivarForm({ row, onClose }: { row: Row; onClose: () => void }) {
  const router = useRouter();
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!motivo.trim()) return setError('El motivo es obligatorio para inactivar.');
    setSaving(true);
    setError('');
    const res = await setColaboradorEstadoAction(row.id, 'INACTIVO', motivo);
    setSaving(false);
    if (res.error) return setError(res.error);
    router.refresh();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5">
      <p className="text-sm text-[var(--text-secondary)]">
        Vas a inactivar a <b className="text-[var(--text)]">{row.nombreCompleto}</b>. El motivo queda guardado en su historial.
      </p>
      <div>
        <label className={labelCls}>Motivo de inactivación *</label>
        <textarea value={motivo} onChange={(e) => setMotivo(up(e.target.value))} className={`${inputCls} min-h-24`} placeholder="Ej. Renunció, no contesta, cambió de ciudad…" />
      </div>
      {error && <p className="rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onClose} type="button" className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60">
          {saving ? 'Guardando…' : 'Inactivar'}
        </button>
      </div>
    </form>
  );
}

function ObservacionForm({ row, onClose }: { row: Row; onClose: () => void }) {
  const router = useRouter();
  const [obs, setObs] = useState(row.observacionNoPrestacion || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!obs.trim()) return setError('Escribe la observación.');
    setSaving(true);
    setError('');
    const res = await setColaboradorObservacionAction(row.id, obs);
    setSaving(false);
    if (res.error) return setError(res.error);
    router.refresh();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-5">
      <p className="text-sm text-[var(--text-secondary)]">
        Después de comunicarte con <b className="text-[var(--text)]">{row.nombreCompleto}</b>, deja acá el motivo por el que no ha prestado servicio.
      </p>
      <div>
        <label className={labelCls}>Observación *</label>
        <textarea value={obs} onChange={(e) => setObs(up(e.target.value))} className={`${inputCls} min-h-24`} placeholder="Ej. Dice que empieza la próxima semana…" />
      </div>
      {error && <p className="rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onClose} type="button" className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-gradient-gold px-4 py-2 text-sm font-bold text-[#141008] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}

function HistorialView({ id }: { id: number }) {
  const [entries, setEntries] = useState<ColaboradorHistorialEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getColaboradorHistorialAction(id).then((rows) => {
      if (!cancelled) setEntries(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!entries) return <p className="p-5 text-sm text-[var(--text-muted)]">Cargando historial…</p>;
  if (entries.length === 0) return <p className="p-5 text-sm text-[var(--text-muted)]">Sin cambios registrados todavía.</p>;

  return (
    <div className="space-y-2 p-5">
      {entries.map((h) => (
        <div key={h.id} className="rounded-lg border border-[var(--border)] p-3 text-xs">
          <div className="flex items-center justify-between text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text-secondary)]">{h.campo}</span>
            <span>{new Date(h.creadoEn).toLocaleString('es-CO')}</span>
          </div>
          <p className="mt-1 text-[var(--text)]">
            {h.valorAnterior ? <>De <span className="text-[var(--text-secondary)]">&quot;{h.valorAnterior}&quot;</span> a </> : ''}
            <span className="font-semibold">&quot;{h.valorNuevo}&quot;</span>
          </p>
          <p className="mt-1 text-[var(--text-muted)]">por {h.usuario}</p>
        </div>
      ))}
    </div>
  );
}

function ColaboradorDetailPanel({ row, onClose }: { row: Row | null; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [servicios, setServicios] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!row) return;
    setServicios([]);
    setLoading(true);
    let cancelled = false;
    getServiciosDeVinculado(row.identificacion)
      .then((rows) => {
        if (!cancelled) setServicios(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [row]);

  useEffect(() => {
    if (!row) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [row, onClose]);

  if (!row || !mounted) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 animate-fade-in-up bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl md:inset-x-8 md:inset-y-6">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">Colaborador</p>
            <h2 className="mt-0.5 text-lg font-bold text-[var(--text)]">{row.nombreCompleto}</h2>
            <p className="text-xs text-[var(--text-muted)]">
              {row.identificacion} · {row.ciudad} · {row.tipoVehiculo} · Agilizador: {row.agilizador || '—'}
            </p>
          </div>
          <button onClick={onClose} className="flex-none rounded-lg border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--accent-bright)]" aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-auto p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="panel-card rounded-xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Finalizados</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400 tabular-nums">{row.cantFinalizados}</p>
            </div>
            <div className="panel-card rounded-xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">No efectivo</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text-secondary)] tabular-nums">{row.cantNoEfectivo}</p>
            </div>
            <div className="panel-card rounded-xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Último servicio</p>
              <p className="mt-1 text-sm font-bold text-[var(--text)]">{row.ultimoServicio || 'Nunca'}</p>
            </div>
            <div className="panel-card rounded-xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Días sin gestionar</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${row.diasSinServicio !== null && row.diasSinServicio >= ALERT_DIAS ? 'text-amber-400' : 'text-[var(--text)]'}`}>
                {row.diasSinServicio ?? '—'}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--accent-bright)]">
              Servicios gestionados ({servicios.length})
            </h3>
            {loading ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">Cargando…</p>
            ) : servicios.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">Aún no ha gestionado ningún servicio.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full min-w-[640px] border-collapse text-xs">
                  <thead>
                    <tr>
                      {['ID servicio', 'Proyecto', 'Estado', 'Ciudad', 'Fecha solicitud'].map((h) => (
                        <th key={h} className="border-b border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {servicios.map((s) => (
                      <tr key={s.id} className="border-b border-[var(--border)]">
                        <td className="whitespace-nowrap px-3 py-2 font-semibold text-[var(--text)]">{s.id}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)]">{s.proyecto}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)]">{s.estado}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)]">{s.ciudad}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)]">{s.fechaSolicitud}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

const tabBtnCls = (active: boolean) =>
  `rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all duration-150 ${
    active ? 'bg-gradient-gold text-[#141008] shadow-[0_0_12px_rgba(214,164,25,0.25)]' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
  }`;

export default function RegistroClient({ colaboradores }: { colaboradores: Row[]; canVerTodo: boolean }) {
  const router = useRouter();
  const [estadoTab, setEstadoTab] = useState<'activo' | 'inactivo'>('activo');
  const [gestionFiltro, setGestionFiltro] = useState<'todos' | 'gestionando' | 'sin-gestionar'>('todos');
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [search, setSearch] = useState('');
  const [formModal, setFormModal] = useState<{ id?: number; initial: Partial<ColaboradorInput> } | null>(null);
  const [inactivarRow, setInactivarRow] = useState<Row | null>(null);
  const [observacionRow, setObservacionRow] = useState<Row | null>(null);
  const [historialId, setHistorialId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [detailRow, setDetailRow] = useState<Row | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const registroPublicoUrl = typeof window !== 'undefined' ? `${window.location.origin}${REGISTRO_PUBLICO_PATH}` : REGISTRO_PUBLICO_PATH;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(registroPublicoUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Si el navegador bloquea el portapapeles, al menos queda el botón de abrir.
    }
  }

  const activos = colaboradores.filter((c) => c.estado === 'ACTIVO');
  const inactivos = colaboradores.filter((c) => c.estado === 'INACTIVO');
  const sinGestionar = activos.filter((c) => c.totalGestiones === 0);
  const alertas = activos.filter((c) => c.diasSinServicio !== null && c.diasSinServicio >= ALERT_DIAS);

  const base = estadoTab === 'activo' ? activos : inactivos;

  const filtered = useMemo(() => {
    let r = base;
    if (estadoTab === 'activo') {
      if (soloAlertas) r = r.filter((c) => c.diasSinServicio !== null && c.diasSinServicio >= ALERT_DIAS);
      if (gestionFiltro === 'gestionando') r = r.filter((c) => c.totalGestiones > 0);
      if (gestionFiltro === 'sin-gestionar') r = r.filter((c) => c.totalGestiones === 0);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter((c) => `${c.nombreCompleto} ${c.identificacion} ${c.ciudad} ${c.agilizador}`.toLowerCase().includes(q));
    }
    return r;
  }, [base, estadoTab, soloAlertas, gestionFiltro, search]);

  async function handleReactivar(row: Row) {
    setTogglingId(row.id);
    await setColaboradorEstadoAction(row.id, 'ACTIVO');
    setTogglingId(null);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <button onClick={() => { setEstadoTab('activo'); setGestionFiltro('todos'); setSoloAlertas(false); }} className="panel-card rounded-xl p-4 text-left transition-colors hover:border-[var(--border-strong)]">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Activos</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)] tabular-nums">{activos.length}</p>
        </button>
        <button onClick={() => setEstadoTab('inactivo')} className="panel-card rounded-xl p-4 text-left transition-colors hover:border-[var(--border-strong)]">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Inactivos</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text-secondary)] tabular-nums">{inactivos.length}</p>
        </button>
        <button onClick={() => { setEstadoTab('activo'); setGestionFiltro('sin-gestionar'); setSoloAlertas(false); }} className="panel-card rounded-xl p-4 text-left transition-colors hover:border-[var(--border-strong)]">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Nunca han gestionado</p>
          <p className="mt-1 text-2xl font-bold text-[var(--text)] tabular-nums">{sinGestionar.length}</p>
        </button>
        <button onClick={() => { setEstadoTab('activo'); setGestionFiltro('todos'); setSoloAlertas(true); }} className="panel-card rounded-xl border-amber-700/40 p-4 text-left transition-colors hover:border-amber-500">
          <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-400">
            <AlertTriangle size={12} /> {ALERT_DIAS}+ días sin servicio
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-400 tabular-nums">{alertas.length}</p>
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-[var(--surface-sunken)] p-1 w-fit">
          <button onClick={() => setEstadoTab('activo')} className={tabBtnCls(estadoTab === 'activo')}>Activos</button>
          <button onClick={() => setEstadoTab('inactivo')} className={tabBtnCls(estadoTab === 'inactivo')}>Inactivos</button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            title={registroPublicoUrl}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"
          >
            {linkCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {linkCopied ? 'Copiado' : 'Copiar link de registro'}
          </button>
          <a
            href={REGISTRO_PUBLICO_PATH}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir formulario público"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"
          >
            <ExternalLink size={14} />
          </a>
          <button
            onClick={() => setFormModal({ initial: emptyInput() })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-gold px-3 py-2 text-xs font-bold text-[#141008] transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <Plus size={14} /> Nuevo colaborador
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-2.5">
        {estadoTab === 'activo' && (
          <>
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Gestión</span>
              <select
                value={gestionFiltro}
                onChange={(e) => setGestionFiltro(e.target.value as typeof gestionFiltro)}
                className="rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
              >
                <option value="todos">Todos</option>
                <option value="gestionando">Ya gestionan</option>
                <option value="sin-gestionar">Nunca han gestionado</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 self-center text-xs font-semibold text-[var(--text-secondary)]">
              <input type="checkbox" checked={soloAlertas} onChange={(e) => setSoloAlertas(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--accent)]" />
              Solo alertas ({ALERT_DIAS}+ días sin servicio)
            </label>
          </>
        )}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, identificación, ciudad…"
          className="w-72 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 text-xs text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
        />
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" /> Ya gestiona</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-500/60" /> Nuevo, aún sin gestionar</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" /> {ALERT_DIAS}+ días sin gestionar</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500/60" /> Inactivo</span>
      </div>

      <div className="panel-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr>
                {['Nombre', 'Identificación', 'Ciudad', 'Vehículo', 'Agilizador', 'Finalizados', 'No efectivo', 'Último servicio', 'Días sin servicio', estadoTab === 'inactivo' ? 'Motivo' : '', ''].map((h) => (
                  <th key={h} className="whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-[var(--text-muted)]">Sin resultados.</td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setDetailRow(r)}
                    className={`cursor-pointer border-b border-[var(--border)] transition-colors ${rowTint(r)}`}
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[var(--text)]">
                      {r.nombreCompleto}
                      {r.origenRegistro === 'formulario' && (
                        <span className="ml-1.5 rounded-full border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent-bright)]">
                          FORMULARIO
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{r.identificacion}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{r.ciudad}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{r.tipoVehiculo}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{r.agilizador || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)] tabular-nums">{r.cantFinalizados}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)] tabular-nums">{r.cantNoEfectivo}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{r.ultimoServicio || 'Nunca'}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                      {r.diasSinServicio === null ? (
                        '—'
                      ) : (
                        <span className={r.diasSinServicio >= ALERT_DIAS && r.estado === 'ACTIVO' ? 'font-bold text-amber-400' : 'text-[var(--text-secondary)]'}>
                          {r.diasSinServicio}
                        </span>
                      )}
                    </td>
                    {estadoTab === 'inactivo' && <td className="max-w-[220px] whitespace-normal px-3 py-2.5 text-[var(--text-secondary)]">{r.motivoInactivacion || '—'}</td>}
                    <td className="whitespace-nowrap px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2.5">
                        <button onClick={() => setHistorialId(r.id)} title="Historial" className="text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-bright)]">
                          <History size={14} />
                        </button>
                        {r.estado === 'ACTIVO' && (
                          <button onClick={() => setObservacionRow(r)} title="Agregar observación" className="text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-bright)]">
                            <MessageSquarePlus size={14} />
                          </button>
                        )}
                        <button onClick={() => setFormModal({ id: r.id, initial: toInput(r) })} className="text-xs font-semibold text-[var(--accent-bright)] hover:underline">
                          Editar
                        </button>
                        {r.estado === 'ACTIVO' ? (
                          <button onClick={() => setInactivarRow(r)} title="Inactivar" className="text-[var(--text-secondary)] transition-colors hover:text-red-400">
                            <ShieldOff size={14} />
                          </button>
                        ) : (
                          <button onClick={() => handleReactivar(r)} disabled={togglingId === r.id} title="Reactivar" className="text-[var(--text-secondary)] transition-colors hover:text-emerald-400 disabled:opacity-50">
                            <ShieldCheck size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-[var(--border)] px-4 py-2.5 text-[11px] text-[var(--text-muted)]">
          {filtered.length.toLocaleString('es-CO')} colaborador{filtered.length === 1 ? '' : 'es'}
        </p>
      </div>

      {formModal && (
        <Modal title={formModal.id ? 'Editar colaborador' : 'Nuevo colaborador'} onClose={() => setFormModal(null)} wide>
          <ColaboradorForm initial={formModal.initial} id={formModal.id} onClose={() => setFormModal(null)} />
        </Modal>
      )}
      {inactivarRow && (
        <Modal title="Inactivar colaborador" onClose={() => setInactivarRow(null)}>
          <InactivarForm row={inactivarRow} onClose={() => setInactivarRow(null)} />
        </Modal>
      )}
      {observacionRow && (
        <Modal title="Observación de no prestación de servicio" onClose={() => setObservacionRow(null)}>
          <ObservacionForm row={observacionRow} onClose={() => setObservacionRow(null)} />
        </Modal>
      )}
      {historialId !== null && (
        <Modal title="Historial de cambios" onClose={() => setHistorialId(null)}>
          <HistorialView id={historialId} />
        </Modal>
      )}
      <ColaboradorDetailPanel row={detailRow} onClose={() => setDetailRow(null)} />
    </div>
  );
}
