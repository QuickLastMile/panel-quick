'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { ColaboradorInput } from '@/lib/colaboradores';
import { TIPOS_IDENTIFICACION, TIPOS_VEHICULO, MEDIOS_VINCULACION, CIUDADES_COLOMBIA } from '@/lib/colaboradores-constants';
import { registrarColaboradorPublico } from './actions';

const inputCls =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]';
const labelCls = 'mb-1 block text-sm font-medium text-[var(--text-secondary)]';

function empty(): ColaboradorInput {
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
    tipoVehiculo: 'Moto',
    medioVinculacion: 'Referido',
    agilizador: '',
  };
}

export default function RegistroPublicoForm() {
  const [form, setForm] = useState<ColaboradorInput>(empty());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = <K extends keyof ColaboradorInput>(k: K, v: ColaboradorInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const sinPlaca = ['A pie', 'Auxiliar', 'Bici'].includes(form.tipoVehiculo);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombreCompleto.trim()) return setError('Escribe tu nombre completo.');
    if (!form.identificacion.trim()) return setError('Escribe tu número de identificación.');
    if (!form.telefono.trim()) return setError('Escribe tu número de teléfono.');
    setSaving(true);
    setError('');
    const res = await registrarColaboradorPublico(form);
    setSaving(false);
    if (res.error) return setError(res.error);
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 size={40} className="text-emerald-400" />
        <p className="text-lg font-bold text-[var(--text)]">¡Registro recibido!</p>
        <p className="text-sm text-[var(--text-secondary)]">
          Gracias, {form.nombreCompleto.split(' ')[0]}. Tu información quedó registrada — el equipo de Quick se pondrá en
          contacto contigo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className={labelCls}>Nombre completo *</label>
        <input value={form.nombreCompleto} onChange={(e) => set('nombreCompleto', e.target.value)} className={inputCls} placeholder="Nombre y apellidos" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tipo de identificación</label>
          <select value={form.tipoIdentificacion} onChange={(e) => set('tipoIdentificacion', e.target.value)} className={inputCls}>
            {TIPOS_IDENTIFICACION.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Número de identificación *</label>
          <input value={form.identificacion} onChange={(e) => set('identificacion', e.target.value.replace(/[^0-9A-Za-z]/g, ''))} className={inputCls} placeholder="Sin puntos ni espacios" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Fecha de nacimiento</label>
          <input type="date" value={form.fechaNacimiento} onChange={(e) => set('fechaNacimiento', e.target.value)} className={`${inputCls} [color-scheme:dark]`} />
        </div>
        <div>
          <label className={labelCls}>Ciudad</label>
          <input value={form.ciudad} onChange={(e) => set('ciudad', e.target.value)} className={inputCls} list="ciudades" placeholder="Tu ciudad" autoComplete="off" />
          <datalist id="ciudades">
            {CIUDADES_COLOMBIA.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Teléfono *</label>
          <input value={form.telefono} onChange={(e) => set('telefono', e.target.value.replace(/[^0-9]/g, ''))} className={inputCls} placeholder="Sin puntos ni espacios" />
        </div>
        <div>
          <label className={labelCls}>Teléfono de emergencia</label>
          <input value={form.telefonoEmergencia} onChange={(e) => set('telefonoEmergencia', e.target.value.replace(/[^0-9]/g, ''))} className={inputCls} placeholder="Sin puntos ni espacios" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Tipo de vehículo</label>
          <select value={form.tipoVehiculo} onChange={(e) => set('tipoVehiculo', e.target.value)} className={inputCls}>
            {TIPOS_VEHICULO.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Placa {sinPlaca && <span className="font-normal text-[var(--text-muted)]">(N/A)</span>}</label>
          <input value={sinPlaca ? 'N/A' : form.placa} onChange={(e) => set('placa', e.target.value.toUpperCase())} className={inputCls} placeholder="Ej. ABC12D" disabled={sinPlaca} />
        </div>
      </div>
      <div>
        <label className={labelCls}>¿Cómo te enteraste de Quick?</label>
        <select value={form.medioVinculacion} onChange={(e) => set('medioVinculacion', e.target.value)} className={inputCls}>
          {MEDIOS_VINCULACION.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>¿Quién te contactó? (agilizador, si lo conoces)</label>
        <input value={form.agilizador} onChange={(e) => set('agilizador', e.target.value)} className={inputCls} placeholder="Opcional" />
      </div>

      {error && <p className="rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="mt-2 rounded-lg bg-gradient-gold px-4 py-2.5 text-sm font-bold text-[#141008] transition-all duration-150 hover:brightness-110 hover:shadow-[0_0_18px_rgba(214,164,25,0.3)] active:scale-[0.98] disabled:opacity-60"
      >
        {saving ? 'Enviando…' : 'Registrarme'}
      </button>
    </form>
  );
}
