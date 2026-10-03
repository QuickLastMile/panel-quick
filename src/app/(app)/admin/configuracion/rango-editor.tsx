'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Check, X } from 'lucide-react';
import type { RangoConfig } from '@/lib/configuracion-types';
import { RANGO_MAX_DIAS } from '@/lib/configuracion-types';
import { saveRango } from './actions';

export default function RangoEditor({ rango, canEdit }: { rango: RangoConfig; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [atras, setAtras] = useState(rango.diasAtras);
  const [adelante, setAdelante] = useState(rango.diasAdelante);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!editing) {
    return (
      <tr className="border-b border-[var(--border)]">
        <td className="py-2.5 text-[var(--text-secondary)]">Rango de descarga</td>
        <td className="py-2.5 text-right">
          <span className="font-semibold text-[var(--text)]">
            {rango.diasAtras} día{rango.diasAtras === 1 ? '' : 's'} atrás a {rango.diasAdelante} día{rango.diasAdelante === 1 ? '' : 's'}{' '}
            adelante
          </span>
          {canEdit && (
            <button
              onClick={() => {
                setAtras(rango.diasAtras);
                setAdelante(rango.diasAdelante);
                setError('');
                setEditing(true);
              }}
              className="ml-2 inline-flex items-center rounded-md border border-[var(--border)] p-1 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--accent-bright)]"
              aria-label="Editar rango"
            >
              <Pencil size={11} />
            </button>
          )}
        </td>
      </tr>
    );
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const res = await saveRango({ diasAtras: atras, diasAdelante: adelante });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
    setEditing(false);
  }

  return (
    <tr className="border-b border-[var(--border)]">
      <td className="py-2.5 align-top text-[var(--text-secondary)]">Rango de descarga</td>
      <td className="py-2.5">
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              días atrás
              <input
                type="number"
                min={0}
                max={RANGO_MAX_DIAS}
                value={atras}
                onChange={(e) => setAtras(Number(e.target.value))}
                className="w-16 rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] px-2 py-1 text-right text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] [color-scheme:dark]"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              días adelante
              <input
                type="number"
                min={0}
                max={RANGO_MAX_DIAS}
                value={adelante}
                onChange={(e) => setAdelante(Number(e.target.value))}
                className="w-16 rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] px-2 py-1 text-right text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] [color-scheme:dark]"
              />
            </label>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-gradient-gold p-1.5 text-[#141008] transition-all hover:brightness-110 disabled:opacity-60"
              aria-label="Guardar"
            >
              <Check size={13} />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-md border border-[var(--border)] p-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]"
              aria-label="Cancelar"
            >
              <X size={13} />
            </button>
          </div>
          {error && <p className="text-right text-[11px] text-red-400">{error}</p>}
        </div>
      </td>
    </tr>
  );
}
