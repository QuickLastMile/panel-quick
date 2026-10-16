'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { refreshNow } from './actions';

export default function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await refreshNow();
      if (res.error) {
        setMessage({ type: 'error', text: res.error });
        return;
      }
      const r = res.result!;
      setMessage({ type: 'ok', text: `Listo — ${r.nuevos} nuevos, ${r.actualizados} actualizados (${r.total} servicios revisados).` });
      router.refresh();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Falló la actualización (sin más detalle).' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-gold px-3 py-2 text-xs font-bold text-[#141008] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Actualizando…' : 'Actualizar ahora'}
      </button>
      {message && (
        <p className={`max-w-xs text-right text-[11px] ${message.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>{message.text}</p>
      )}
    </div>
  );
}
