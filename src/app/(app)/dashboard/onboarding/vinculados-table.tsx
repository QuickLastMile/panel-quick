'use client';

import { useMemo, useState } from 'react';
import type { VinculacionRow } from '@/lib/onboarding';
import { parseFechaSolicitud } from '@/lib/date-filter';

const PAGE_SIZE = 50;

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

type Col = { key: keyof VinculacionRow; label: string };

const COLS: Col[] = [
  { key: 'nombreCompleto', label: 'Nombre completo' },
  { key: 'identificacion', label: 'Identificación' },
  { key: 'fechaVinculacion', label: 'Fecha vinculación' },
  { key: 'ciudad', label: 'Ciudad' },
  { key: 'vehiculo', label: 'Vehículo' },
  { key: 'agilizador', label: 'Agilizador' },
  { key: 'ultimoServicio', label: 'Último servicio' },
  { key: 'cantFinalizados', label: 'Finalizados' },
  { key: 'cantFinalizadosNovedad', label: 'Con novedad' },
  { key: 'totalGestiones', label: 'Total gestiones' },
  { key: 'ultimoEstado', label: 'Último estado' },
];

function distinct(rows: VinculacionRow[], key: keyof VinculacionRow): string[] {
  const set = new Set<string>();
  rows.forEach((r) => {
    const v = String(r[key] || '').trim();
    if (v) set.add(v);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
}

export default function VinculadosTable({
  rows,
  allRows,
  onSelect,
}: {
  // Vinculados según el filtro de fecha de la página de arriba.
  rows: VinculacionRow[];
  // Histórico completo (acotado solo por agilizador si hay filtro) — para
  // el toggle "mostrar todos", con sus propios filtros de mes/día.
  allRows: VinculacionRow[];
  onSelect: (row: VinculacionRow) => void;
}) {
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [fMes, setFMes] = useState('');
  const [fDia, setFDia] = useState('');
  const [search, setSearch] = useState('');
  const [fCiudad, setFCiudad] = useState('');
  const [fVehiculo, setFVehiculo] = useState('');
  const [fGestion, setFGestion] = useState('');
  const [sort, setSort] = useState<{ col: keyof VinculacionRow; dir: 'asc' | 'desc' }>({ col: 'fechaVinculacion', dir: 'desc' });
  const [page, setPage] = useState(0);

  const mesOptions = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach((r) => {
      const f = parseFechaSolicitud(r.fechaVinculacion);
      if (f) set.add(`${f.year}-${pad2(f.month)}`);
    });
    return Array.from(set).sort().reverse();
  }, [allRows]);

  const diaOptions = useMemo(() => {
    if (!fMes) return [];
    const [y, m] = fMes.split('-').map(Number);
    const set = new Set<number>();
    allRows.forEach((r) => {
      const f = parseFechaSolicitud(r.fechaVinculacion);
      if (f && f.year === y && f.month === m) set.add(f.day);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [allRows, fMes]);

  // Base de filas antes de los filtros de ciudad/vehículo/gestión/búsqueda:
  // histórico completo + mes/día propios si "mostrar todos" está activo, o
  // las filas ya acotadas por el filtro de fecha de la página si no.
  const baseRows = useMemo(() => {
    if (!mostrarTodos) return rows;
    if (!fMes) return allRows;
    const [y, m] = fMes.split('-').map(Number);
    return allRows.filter((r) => {
      const f = parseFechaSolicitud(r.fechaVinculacion);
      if (!f || f.year !== y || f.month !== m) return false;
      if (fDia && f.day !== Number(fDia)) return false;
      return true;
    });
  }, [rows, allRows, mostrarTodos, fMes, fDia]);

  const filterOptions = useMemo(
    () => ({
      ciudad: distinct(baseRows, 'ciudad'),
      vehiculo: distinct(baseRows, 'vehiculo'),
    }),
    [baseRows]
  );

  const filtered = useMemo(() => {
    let r = baseRows.filter(
      (row) =>
        (!fCiudad || row.ciudad === fCiudad) &&
        (!fVehiculo || row.vehiculo === fVehiculo) &&
        (!fGestion || row.gestionStatus === fGestion)
    );
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((row) => COLS.some((c) => String(row[c.key] || '').toLowerCase().includes(q)));
    }
    return r.slice().sort((a, b) => {
      const cmp = String(a[sort.col] || '').localeCompare(String(b[sort.col] || ''), 'es', { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [baseRows, fCiudad, fVehiculo, fGestion, search, sort]);

  const maxPage = Math.max(Math.ceil(filtered.length / PAGE_SIZE) - 1, 0);
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(col: keyof VinculacionRow) {
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
    setPage(0);
  }

  function toggleMostrarTodos() {
    setMostrarTodos((prev) => !prev);
    setFMes('');
    setFDia('');
    setPage(0);
  }

  function clearFilters() {
    setFCiudad('');
    setFVehiculo('');
    setFGestion('');
    setFMes('');
    setFDia('');
    setPage(0);
  }

  const activeFilterCount = [fCiudad, fVehiculo, fGestion, mostrarTodos ? fMes : '', mostrarTodos ? fDia : ''].filter(Boolean).length;

  return (
    <div className="panel-card rounded-xl p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2.5">
        <div className="flex flex-wrap items-end gap-2.5">
          <label className="flex items-center gap-1.5 self-center text-xs font-semibold text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={mostrarTodos}
              onChange={toggleMostrarTodos}
              className="h-3.5 w-3.5 accent-[var(--accent)]"
            />
            Mostrar todos los vinculados
          </label>
          {mostrarTodos && (
            <>
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Mes</span>
                <select
                  value={fMes}
                  onChange={(e) => {
                    setFMes(e.target.value);
                    setFDia('');
                    setPage(0);
                  }}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
                >
                  <option value="">Todos</option>
                  {mesOptions.map((m) => {
                    const [y, mo] = m.split('-').map(Number);
                    return (
                      <option key={m} value={m}>
                        {MESES[mo - 1]} {y}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Día</span>
                <select
                  value={fDia}
                  onChange={(e) => {
                    setFDia(e.target.value);
                    setPage(0);
                  }}
                  disabled={!fMes}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)] disabled:opacity-40"
                >
                  <option value="">Todos</option>
                  {diaOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
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
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Gestión</span>
            <select
              value={fGestion}
              onChange={(e) => {
                setFGestion(e.target.value);
                setPage(0);
              }}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
            >
              <option value="">Todos</option>
              <option value="SIN GESTIÓN">Sin gestión</option>
              <option value="PRIMER SERVICIO NO EFECTIVO">Primer servicio no efectivo</option>
              <option value="GESTIONANDO">Gestionando</option>
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

      <div className="mb-3 text-xs text-[var(--text-muted)]">
        {filtered.length.toLocaleString('es-CO')} vinculados — clic en una fila para ver el detalle
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[1100px] border-collapse text-xs">
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
                <tr
                  key={`${row.workerId}-${row.identificacion}`}
                  onClick={() => onSelect(row)}
                  className="cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]"
                >
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
