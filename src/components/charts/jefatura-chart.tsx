'use client';

import { useMemo, useState } from 'react';
import RankingBarList from './ranking-bar-list';
import type { DiaJefaturaPoint } from '@/lib/aggregate';

export default function JefaturaChart({
  porJefatura,
  diaJefatura,
  showFilter,
}: {
  porJefatura: { key: string; count: number }[];
  diaJefatura: DiaJefaturaPoint[];
  showFilter: boolean;
}) {
  const [mes, setMes] = useState('');
  const [dia, setDia] = useState('');

  const meses = useMemo(() => {
    const map = new Map<string, string>();
    diaJefatura.forEach((p) => map.set(p.mes, p.mesLabel));
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [diaJefatura]);

  const dias = useMemo(() => {
    const map = new Map<string, string>();
    diaJefatura.forEach((p) => {
      if (!mes || p.mes === mes) map.set(p.fecha, p.fechaLabel);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [diaJefatura, mes]);

  const overriding = Boolean(mes || dia);

  const items = useMemo(() => {
    if (!overriding) return porJefatura;
    const map: Record<string, number> = {};
    diaJefatura.forEach((p) => {
      if (dia && p.fecha !== dia) return;
      if (!dia && mes && p.mes !== mes) return;
      map[p.jefatura] = (map[p.jefatura] || 0) + p.count;
    });
    return Object.entries(map)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }, [overriding, porJefatura, diaJefatura, mes, dia]);

  return (
    <div>
      {showFilter && (
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          <select
            value={mes}
            onChange={(e) => {
              setMes(e.target.value);
              setDia('');
            }}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
          >
            <option value="">Según filtro de la página</option>
            {meses.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            disabled={!mes}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)] disabled:opacity-40"
          >
            <option value="">Todo el mes</option>
            {dias.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}
      {items.length ? (
        <RankingBarList items={items} />
      ) : (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin servicios para este filtro.</p>
      )}
    </div>
  );
}
