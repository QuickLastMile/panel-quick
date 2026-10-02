'use client';

import { useMemo, useState } from 'react';

const FRANJA_ORDER = ['Madrugada (00-06)', 'Mañana (06-12)', 'Tarde (12-18)', 'Noche (18-24)'];

export default function FranjaChart({
  porFranja,
  franjaCiudad,
  ciudades,
}: {
  porFranja: { key: string; count: number }[];
  franjaCiudad: { ciudad: string; franja: string; count: number }[];
  ciudades: string[];
}) {
  const [ciudad, setCiudad] = useState('');

  const source = useMemo(() => {
    if (!ciudad) return Object.fromEntries(porFranja.map((p) => [p.key, p.count]));
    const m: Record<string, number> = {};
    franjaCiudad.filter((r) => r.ciudad === ciudad).forEach((r) => (m[r.franja] = r.count));
    return m;
  }, [ciudad, porFranja, franjaCiudad]);

  const max = Math.max(...FRANJA_ORDER.map((f) => source[f] || 0), 1);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <select
          value={ciudad}
          onChange={(e) => setCiudad(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
        >
          <option value="">Todas las ciudades</option>
          {ciudades.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end gap-5 px-1">
        {FRANJA_ORDER.map((f) => {
          const c = source[f] || 0;
          const h = Math.max((c / max) * 100, c > 0 ? 4 : 0);
          const [name, range] = f.split(' (');
          return (
            <div key={f} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-xs font-bold tabular-nums text-[var(--text)]">{c.toLocaleString('es-CO')}</span>
              {/* Contenedor con altura fija: el % de la barra necesita una
                  altura definida en el padre para poder calcularse. */}
              <div className="flex h-32 w-full max-w-14 items-end overflow-hidden rounded-t bg-[var(--surface-sunken)]">
                <div
                  className="w-full rounded-t bg-gradient-gold transition-[height,filter] duration-300 hover:brightness-110"
                  style={{ height: `${h}%` }}
                  title={`${f}: ${c} servicios`}
                />
              </div>
              <span className="text-center text-[11px] leading-tight text-[var(--text-muted)]">
                {name}
                <br />({range}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
