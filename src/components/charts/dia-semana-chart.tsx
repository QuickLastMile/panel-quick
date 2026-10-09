'use client';

import { useMemo, useState } from 'react';
import RankingBarList from './ranking-bar-list';
import { WEEKDAY_LABELS, type DiaSemanaPoint } from '@/lib/aggregate';

export default function DiaSemanaChart({ diaSemana }: { diaSemana: DiaSemanaPoint[] }) {
  const [gestor, setGestor] = useState('');
  const [mes, setMes] = useState('');

  const gestores = useMemo(() => {
    const set = new Set<string>();
    diaSemana.forEach((p) => set.add(p.gestor));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [diaSemana]);

  const meses = useMemo(() => {
    const map = new Map<string, string>();
    diaSemana.forEach((p) => {
      if (!gestor || p.gestor === gestor) map.set(p.mes, p.mesLabel);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [diaSemana, gestor]);

  const items = useMemo(() => {
    const counts = new Array(7).fill(0);
    diaSemana.forEach((p) => {
      if (gestor && p.gestor !== gestor) return;
      if (mes && p.mes !== mes) return;
      counts[p.weekday] += p.count;
    });
    return WEEKDAY_LABELS.map((label, i) => ({ key: label, count: counts[i] }));
  }, [diaSemana, gestor, mes]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <select
          value={gestor}
          onChange={(e) => {
            setGestor(e.target.value);
            setMes('');
          }}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
        >
          <option value="">Todos los gestores</option>
          {gestores.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
        >
          <option value="">Todo el histórico</option>
          {meses.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {items.some((i) => i.count > 0) ? (
        <RankingBarList items={items} />
      ) : (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">Sin servicios para este filtro.</p>
      )}
    </div>
  );
}
