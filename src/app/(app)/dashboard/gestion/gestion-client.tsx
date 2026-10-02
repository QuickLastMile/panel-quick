'use client';

import { useMemo, useState } from 'react';
import type { GestionRow } from '@/lib/aggregate';
import StatusPill from '@/components/status-pill';

const GROUPS = ['En Espera', 'Relanzado', 'Asignado', 'En Tránsito', 'Finalizado', 'Cancelado'] as const;
const PAGE_SIZE = 50;

type Col = { key: keyof GestionRow; label: string };

const BASE_COLS: Col[] = [
  { key: 'proyecto', label: 'Proyecto' },
  { key: 'id', label: 'ID servicio' },
  { key: 'fechaSolicitud', label: 'Fecha servicio' },
  { key: 'horaServicio', label: 'Hora servicio' },
  { key: 'direccion', label: 'Dirección' },
  { key: 'ciudad', label: 'Ciudad' },
  { key: 'fechaCreacion', label: 'Fecha creación' },
  { key: 'horaCreacion', label: 'Hora creación' },
  { key: 'gestor', label: 'Gestor' },
];
const CONDUCTOR_COLS: Col[] = [
  { key: 'nombreTrabajador', label: 'Trabajador' },
  { key: 'identTrabajador', label: 'Ident. trabajador' },
  { key: 'placa', label: 'Placa' },
];

function columnsFor(group: string): Col[] {
  if (group === 'Asignado' || group === 'En Tránsito' || group === 'Finalizado') return [...BASE_COLS, ...CONDUCTOR_COLS];
  if (group === 'Cancelado') return [...BASE_COLS, ...CONDUCTOR_COLS, { key: 'razonCancelacion', label: 'Motivo' }];
  return BASE_COLS;
}

export default function GestionClient({ gestion }: { gestion: Record<string, GestionRow[]> }) {
  const [group, setGroup] = useState<string>('En Espera');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ col: keyof GestionRow; dir: 'asc' | 'desc' }>({ col: 'fechaSolicitud', dir: 'desc' });
  const [page, setPage] = useState(0);

  const cols = columnsFor(group);
  const rows = gestion[group] || [];

  const filtered = useMemo(() => {
    let r = rows;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((row) => cols.some((c) => String(row[c.key] || '').toLowerCase().includes(q)));
    }
    return r.slice().sort((a, b) => {
      const cmp = String(a[sort.col] || '').localeCompare(String(b[sort.col] || ''), 'es', { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, search, sort, cols]);

  const maxPage = Math.max(Math.ceil(filtered.length / PAGE_SIZE) - 1, 0);
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function selectGroup(g: string) {
    setGroup(g);
    setSearch('');
    setPage(0);
    setSort({ col: 'fechaSolicitud', dir: 'desc' });
  }

  function toggleSort(col: keyof GestionRow) {
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
    setPage(0);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <button
            key={g}
            onClick={() => selectGroup(g)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-all duration-150 ${
              group === g
                ? 'border-[var(--accent)] bg-gradient-gold text-[#141008] shadow-[0_0_14px_rgba(214,164,25,0.22)]'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text)]'
            }`}
          >
            <StatusPill status={g} />
            <span
              className={
                group === g
                  ? 'rounded-full bg-black/15 px-1.5 py-0.5 text-[#141008]'
                  : 'rounded-full bg-[var(--surface-sunken)] px-1.5 py-0.5 text-[var(--text-muted)]'
              }
            >
              {(gestion[g] || []).length.toLocaleString('es-CO')}
            </span>
          </button>
        ))}
      </div>

      <div className="panel-card rounded-xl p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar por ID, dirección, proyecto, gestor…"
            className="w-72 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 text-xs text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
          />
          <span className="text-xs text-[var(--text-muted)]">{filtered.length.toLocaleString('es-CO')} servicios</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[800px] border-collapse text-xs">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    className={`cursor-pointer whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide transition-colors ${
                      sort.col === c.key ? 'text-[var(--accent-bright)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {c.label} {sort.col === c.key ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={cols.length} className="px-3 py-10 text-center text-[var(--text-muted)]">
                    Sin servicios en este estado con el filtro actual.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]">
                    {cols.map((c, i) => (
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

        {filtered.length > 0 && (
          <div className="mt-3 flex items-center justify-end gap-3 text-xs text-[var(--text-secondary)]">
            <span>
              Página {page + 1} de {maxPage + 1}
            </span>
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-[var(--border)] px-2.5 py-1 font-semibold transition-colors hover:border-[var(--border-strong)] disabled:opacity-40"
            >
              ← Anterior
            </button>
            <button
              disabled={page === maxPage}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-[var(--border)] px-2.5 py-1 font-semibold transition-colors hover:border-[var(--border-strong)] disabled:opacity-40"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
