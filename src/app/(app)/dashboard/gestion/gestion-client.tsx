'use client';

import { useMemo, useState, useRef, useCallback } from 'react';
import type { ServiceRow } from '@/lib/sheets';
import StatusPill from '@/components/status-pill';
import ServiceDetailPanel from '@/components/service-detail-panel';
import { STATUS_COLOR } from '@/lib/status-colors';
import { isSinClasificar } from '@/lib/aggregate';

const GROUPS = ['En Espera', 'Relanzado', 'Asignado', 'En Tránsito', 'Finalizado', 'Cancelado'] as const;
const PAGE_SIZE = 50;

type Col = { key: keyof ServiceRow; label: string; width: number };

const BASE_COLS: Col[] = [
  { key: 'proyecto', label: 'Proyecto', width: 190 },
  { key: 'id', label: 'ID servicio', width: 110 },
  { key: 'fechaSolicitud', label: 'Fecha servicio', width: 120 },
  { key: 'horaServicio', label: 'Hora servicio', width: 110 },
  { key: 'direccion', label: 'Dirección', width: 220 },
  { key: 'ciudad', label: 'Ciudad', width: 120 },
  { key: 'fechaCreacion', label: 'Fecha creación', width: 120 },
  { key: 'horaCreacion', label: 'Hora creación', width: 110 },
  { key: 'gestor', label: 'Gestor', width: 160 },
];
const CONDUCTOR_COLS: Col[] = [
  { key: 'nombreTrabajador', label: 'Trabajador', width: 180 },
  { key: 'identTrabajador', label: 'Ident. trabajador', width: 130 },
  { key: 'placa', label: 'Placa', width: 90 },
];

function columnsFor(group: string): Col[] {
  if (group === 'Asignado' || group === 'En Tránsito' || group === 'Finalizado') return [...BASE_COLS, ...CONDUCTOR_COLS];
  if (group === 'Cancelado') return [...BASE_COLS, ...CONDUCTOR_COLS, { key: 'razonCancelacion', label: 'Motivo', width: 180 }];
  return BASE_COLS;
}

const CONOCIDOS = new Set(['En Espera', 'Relanzado', 'Asignado', 'En Transito', 'En Tránsito', 'Finalizado', 'Cancelado', 'Finalizado Cancelado']);

function groupByEstado(rows: ServiceRow[]): Record<string, ServiceRow[]> {
  const out: Record<string, ServiceRow[]> = {
    'En Espera': [],
    'Relanzado': [],
    'Asignado': [],
    'En Tránsito': [],
    'Finalizado': [],
    'Cancelado': [],
  };
  const otros: ServiceRow[] = [];
  rows.forEach((r) => {
    if (r.estado === 'En Espera') out['En Espera'].push(r);
    else if (r.estado === 'Relanzado') out['Relanzado'].push(r);
    else if (r.estado === 'Asignado') out['Asignado'].push(r);
    else if (r.estado === 'En Transito' || r.estado === 'En Tránsito') out['En Tránsito'].push(r);
    else if (r.estado === 'Finalizado') out['Finalizado'].push(r);
    else if (r.estado === 'Cancelado' || r.estado === 'Finalizado Cancelado') out['Cancelado'].push(r);
    else otros.push(r);
  });
  if (otros.length) out['Otros'] = otros;
  return out;
}

function distinct(rows: ServiceRow[], key: keyof ServiceRow, excludeSinClasificar = false): string[] {
  const set = new Set<string>();
  rows.forEach((r) => {
    const v = String(r[key] || '').trim();
    if (v && !(excludeSinClasificar && isSinClasificar(v))) set.add(v);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
}

export default function GestionClient({ rows }: { rows: ServiceRow[] }) {
  const [group, setGroup] = useState<string>('En Espera');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ col: keyof ServiceRow; dir: 'asc' | 'desc' }>({ col: 'fechaSolicitud', dir: 'desc' });
  const [page, setPage] = useState(0);
  const [selectedRow, setSelectedRow] = useState<ServiceRow | null>(null);

  const [fProyecto, setFProyecto] = useState('');
  const [fJefatura, setFJefatura] = useState('');
  const [fTipoServicio, setFTipoServicio] = useState('');
  const [fServicio, setFServicio] = useState('');
  const [fCiudad, setFCiudad] = useState('');

  // Anchos de columna — a propósito solo en memoria: si recargas la página
  // vuelven al default (no se guardan en localStorage ni en la URL).
  const [widths, setWidths] = useState<Record<string, number>>({});
  const dragState = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const startResize = useCallback(
    (e: React.MouseEvent, col: Col) => {
      e.preventDefault();
      e.stopPropagation();
      dragState.current = { key: col.key, startX: e.clientX, startWidth: widths[col.key] ?? col.width };
      function onMove(ev: MouseEvent) {
        // Captura dragState.current en una variable local ANTES de llamar a
        // setWidths: el callback de setWidths puede ejecutarse después de
        // que onUp ya puso dragState.current en null (sobre todo con eventos
        // nativos fuera del sistema sintético de React), y leerlo adentro
        // del callback revienta con "Cannot read properties of null".
        const state = dragState.current;
        if (!state) return;
        const delta = ev.clientX - state.startX;
        const next = Math.max(70, state.startWidth + delta);
        setWidths((w) => ({ ...w, [state.key]: next }));
      }
      function onUp() {
        dragState.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [widths]
  );

  const filteredRows = useMemo(() => {
    return rows.filter(
      (r) =>
        (!fProyecto || r.proyecto === fProyecto) &&
        (!fJefatura || r.jefatura === fJefatura) &&
        (!fTipoServicio || r.tipoServicio === fTipoServicio) &&
        (!fServicio || r.servicio === fServicio) &&
        (!fCiudad || r.ciudad === fCiudad)
    );
  }, [rows, fProyecto, fJefatura, fTipoServicio, fServicio, fCiudad]);

  const grouped = useMemo(() => groupByEstado(filteredRows), [filteredRows]);

  const filterOptions = useMemo(
    () => ({
      proyecto: distinct(rows, 'proyecto'),
      jefatura: distinct(rows, 'jefatura', true),
      tipoServicio: distinct(rows, 'tipoServicio'),
      servicio: distinct(rows, 'servicio'),
      ciudad: distinct(rows, 'ciudad'),
    }),
    [rows]
  );

  const cols = columnsFor(group);
  const groupRows = grouped[group] || [];

  const filtered = useMemo(() => {
    let r = groupRows;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((row) => cols.some((c) => String(row[c.key] || '').toLowerCase().includes(q)));
    }
    return r.slice().sort((a, b) => {
      const cmp = String(a[sort.col] || '').localeCompare(String(b[sort.col] || ''), 'es', { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [groupRows, search, sort, cols]);

  const maxPage = Math.max(Math.ceil(filtered.length / PAGE_SIZE) - 1, 0);
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function selectGroup(g: string) {
    setGroup(g);
    setSearch('');
    setPage(0);
    setSort({ col: 'fechaSolicitud', dir: 'desc' });
  }

  function toggleSort(col: keyof ServiceRow) {
    setSort((prev) => (prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));
    setPage(0);
  }

  const FILTERS: { label: string; value: string; set: (v: string) => void; options: string[] }[] = [
    { label: 'Proyecto', value: fProyecto, set: setFProyecto, options: filterOptions.proyecto },
    { label: 'Jefatura', value: fJefatura, set: setFJefatura, options: filterOptions.jefatura },
    { label: 'Tipo de servicio', value: fTipoServicio, set: setFTipoServicio, options: filterOptions.tipoServicio },
    { label: 'Servicio', value: fServicio, set: setFServicio, options: filterOptions.servicio },
    { label: 'Ciudad', value: fCiudad, set: setFCiudad, options: filterOptions.ciudad },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {GROUPS.map((g) => {
          const active = group === g;
          const color = STATUS_COLOR[g] || '#8a8a8a';
          return (
            <button
              key={g}
              onClick={() => selectGroup(g)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-all duration-150 ${
                active
                  ? ''
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text)]'
              }`}
              style={active ? { borderColor: color, background: `${color}22`, color, boxShadow: `0 0 14px ${color}2e` } : undefined}
            >
              <StatusPill status={g} />
              <span
                className="rounded-full px-1.5 py-0.5"
                style={active ? { background: `${color}33`, color } : { background: 'var(--surface-sunken)', color: 'var(--text-muted)' }}
              >
                {(grouped[g] || []).length.toLocaleString('es-CO')}
              </span>
            </button>
          );
        })}
      </div>

      <div className="panel-card mb-4 rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-3">
          {FILTERS.map((f) => (
            <label key={f.label} className="flex flex-col gap-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{f.label}</span>
              <select
                value={f.value}
                onChange={(e) => {
                  f.set(e.target.value);
                  setPage(0);
                }}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
              >
                <option value="">Todos</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {(fProyecto || fJefatura || fTipoServicio || fServicio || fCiudad) && (
            <button
              onClick={() => {
                setFProyecto('');
                setFJefatura('');
                setFTipoServicio('');
                setFServicio('');
                setFCiudad('');
                setPage(0);
              }}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--accent-bright)] hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
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
          <table className="border-collapse text-xs" style={{ tableLayout: 'fixed', width: cols.reduce((s, c) => s + (widths[c.key] ?? c.width), 0) }}>
            <colgroup>
              {cols.map((c) => (
                <col key={c.key} style={{ width: widths[c.key] ?? c.width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    className={`relative cursor-pointer select-none overflow-hidden text-ellipsis whitespace-nowrap border-b border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wide transition-colors ${
                      sort.col === c.key ? 'text-[var(--accent-bright)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {c.label} {sort.col === c.key ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
                    <div
                      onMouseDown={(e) => startResize(e, c)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize hover:bg-[var(--accent)]/50"
                    />
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
                  <tr
                    key={row.id}
                    onClick={() => setSelectedRow(row)}
                    className="cursor-pointer border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    {cols.map((c, i) => (
                      <td
                        key={c.key}
                        className={`overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2 ${i === 0 ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}
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

      <ServiceDetailPanel row={selectedRow} onClose={() => setSelectedRow(null)} />
    </div>
  );
}
