'use client';

import { useMemo, useState } from 'react';
import type { VinculacionRow } from '@/lib/onboarding';

const PAGE_SIZE = 50;

type Col = { key: keyof VinculacionRow; label: string };

const COLS: Col[] = [
  { key: 'nombreCompleto', label: 'Nombre completo' },
  { key: 'identificacion', label: 'Identificación' },
  { key: 'tipoIdentificacion', label: 'Tipo ident.' },
  { key: 'fechaVinculacion', label: 'Fecha vinculación' },
  { key: 'ciudad', label: 'Ciudad' },
  { key: 'vehiculo', label: 'Vehículo' },
  { key: 'agilizador', label: 'Agilizador' },
  { key: 'estadoWorker', label: 'Estado' },
];

function distinct(rows: VinculacionRow[], key: keyof VinculacionRow): string[] {
  const set = new Set<string>();
  rows.forEach((r) => {
    const v = String(r[key] || '').trim();
    if (v) set.add(v);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
}

export default function VinculadosTable({ rows }: { rows: VinculacionRow[] }) {
  const [search, setSearch] = useState('');
  const [fAgilizador, setFAgilizador] = useState('');
  const [fCiudad, setFCiudad] = useState('');
  const [fVehiculo, setFVehiculo] = useState('');
  const [sort, setSort] = useState<{ col: keyof VinculacionRow; dir: 'asc' | 'desc' }>({ col: 'fechaVinculacion', dir: 'desc' });
  const [page, setPage] = useState(0);

  const filterOptions = useMemo(
    () => ({
      agilizador: distinct(rows, 'agilizador'),
      ciudad: distinct(rows, 'ciudad'),
      vehiculo: distinct(rows, 'vehiculo'),
    }),
    [rows]
  );

  const filtered = useMemo(() => {
    let r = rows.filter(
      (row) =>
        (!fAgilizador || row.agilizador === fAgilizador) &&
        (!fCiudad || row.ciudad === fCiudad) &&
        (!fVehiculo || row.vehiculo === fVehiculo)
    );
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((row) => COLS.some((c) => String(row[c.key] || '').toLowerCase().includes(q)));
    }
    return r.slice().sort((a, b) => {
      const cmp = String(a[sort.col] || '').localeCompare(String(b[sort.col] || ''), 'es', { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, fAgilizador, fCiudad, fVehiculo, search, sort]);

  const maxPage = Math.max(Math.ceil(filtered.length / PAGE_SIZE) - 1, 0);
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(col: keyof VinculacionRow) {
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
    setPage(0);
  }

  function clearFilters() {
    setFAgilizador('');
    setFCiudad('');
    setFVehiculo('');
    setPage(0);
  }

  const activeFilterCount = [fAgilizador, fCiudad, fVehiculo].filter(Boolean).length;

  return (
    <div className="panel-card rounded-xl p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2.5">
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Agilizador</span>
            <select
              value={fAgilizador}
              onChange={(e) => {
                setFAgilizador(e.target.value);
                setPage(0);
              }}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
            >
              <option value="">Todos</option>
              {filterOptions.agilizador.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Ciudad</span>
            <select
              value={fCiudad}
              onChange={(e) => {
                setFCiudad(e.target.value);
                setPage(0);
              }}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
            >
              <option value="">Todas</option>
              {filterOptions.ciudad.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Vehículo</span>
            <select
              value={fVehiculo}
              onChange={(e) => {
                setFVehiculo(e.target.value);
                setPage(0);
              }}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
            >
              <option value="">Todos</option>
              {filterOptions.vehiculo.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-xs font-semibold text-[var(--accent-bright)] hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Buscar por nombre, identificación…"
          className="w-64 rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2 text-xs text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
        />
      </div>

      <div className="mb-3 text-xs text-[var(--text-muted)]">{filtered.length.toLocaleString('es-CO')} vinculados</div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[920px] border-collapse text-xs">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className={`cursor-pointer select-none whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide transition-colors ${
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
                <td colSpan={COLS.length} className="px-3 py-10 text-center text-[var(--text-muted)]">
                  Sin vinculados con el filtro actual.
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={`${row.workerId}-${row.identificacion}`} className="border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]">
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
  );
}
