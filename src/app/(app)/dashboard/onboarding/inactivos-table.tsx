'use client';

import { useMemo, useState } from 'react';
import type { VinculacionRow } from '@/lib/onboarding';

type Col = { key: keyof VinculacionRow; label: string };

const COLS: Col[] = [
  { key: 'nombreCompleto', label: 'Nombre completo' },
  { key: 'identificacion', label: 'Identificación' },
  { key: 'fechaVinculacion', label: 'Fecha vinculación' },
  { key: 'estadoWorker', label: 'Estado del worker' },
  { key: 'ciudad', label: 'Ciudad' },
  { key: 'agilizador', label: 'Agilizador' },
  { key: 'motivoInactivacion', label: 'Motivo de inactivación' },
];

export default function InactivosTable({ rows }: { rows: VinculacionRow[] }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((row) => COLS.some((c) => String(row[c.key] || '').toLowerCase().includes(q)));
  }, [rows, search]);

  return (
    <div className="panel-card rounded-xl p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <p className="text-xs text-[var(--text-muted)]">
          {filtered.length.toLocaleString('es-CO')} vinculados en estado distinto de activo
        </p>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, identificación…"
          className="w-64 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 text-xs text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[800px] border-collapse text-xs">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className="whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={COLS.length} className="px-3 py-10 text-center text-[var(--text-muted)]">
                  Sin vinculados inactivos con el filtro actual.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={`${row.workerId}-${row.identificacion}`} className="border-b border-[var(--border)]">
                  {COLS.map((c, i) => (
                    <td
                      key={c.key}
                      className={`whitespace-nowrap px-3 py-2 ${i === 0 ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}
                    >
                      {String(row[c.key] || '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
