'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import type { ServiceRow } from '@/lib/sheets';
import { searchServicios } from '@/app/(app)/search-actions';
import StatusPill from './status-pill';
import ServiceDetailPanel from './service-detail-panel';

const DEBOUNCE_MS = 300;

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<ServiceRow | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const myReqId = ++reqIdRef.current;
    timerRef.current = setTimeout(async () => {
      const res = await searchServicios(q);
      if (myReqId === reqIdRef.current) {
        setResults(res);
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function handleSelect(row: ServiceRow) {
    setSelectedRow(row);
    setOpen(false);
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/95 px-8 py-3 backdrop-blur-sm">
      <div ref={containerRef} className="relative mx-auto max-w-7xl">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Buscar en todo el histórico — ID de servicio, cédula, nombre de mensajero o agilizador…"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-sunken)] py-2 pl-9 pr-9 text-sm text-[var(--text)] outline-none transition-colors focus:border-[var(--accent)]"
        />
        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--text-muted)]" />}
        {!loading && query && (
          <button
            onClick={handleClear}
            aria-label="Limpiar búsqueda"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--accent-bright)]"
          >
            <X size={14} />
          </button>
        )}

        {open && query.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-96 overflow-auto rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-2xl">
            {loading && results.length === 0 ? (
              <p className="px-4 py-4 text-center text-xs text-[var(--text-muted)]">Buscando…</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-4 text-center text-xs text-[var(--text-muted)]">Sin resultados.</p>
            ) : (
              <>
                <table className="w-full border-collapse text-xs">
                  <tbody>
                    {results.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => handleSelect(r)}
                        className="cursor-pointer border-b border-[var(--border)] transition-colors last:border-0 hover:bg-[var(--surface-hover)]"
                      >
                        <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-[var(--text)]">{r.id}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{r.nombreTrabajador || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{r.gestor || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[var(--text-secondary)]">{r.proyecto}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <StatusPill status={r.estado} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right text-[var(--text-secondary)]">{r.fechaSolicitud}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {results.length === 20 && (
                  <p className="border-t border-[var(--border)] px-4 py-2 text-center text-[10.5px] text-[var(--text-muted)]">
                    Mostrando los primeros 20 — afina la búsqueda para ver menos resultados.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <ServiceDetailPanel row={selectedRow} onClose={() => setSelectedRow(null)} />
    </div>
  );
}
