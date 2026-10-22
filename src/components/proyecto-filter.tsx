'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

// Centinela para "ninguno seleccionado a propósito" — sin esto, una lista
// vacía es indistinguible de "sin filtro en la URL" (que ya significa
// "todos"), así que no había forma de representar "ninguno" para poder
// marcar uno solo sin desmarcar todo lo demás a mano.
const NINGUNO = '__NINGUNO__';

export default function ProyectoFilter({ proyectos, selected }: { proyectos: string[]; selected: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!proyectos.length) return null;

  const esNinguno = selected.length === 1 && selected[0] === NINGUNO;
  // `selected` vacío (sin param en la URL) = predeterminado "todos
  // seleccionados" — se muestra así (checkboxes marcados), no como "ninguno".
  const effectiveSelected = esNinguno ? [] : selected.length === 0 ? proyectos : selected;
  const allSelected = effectiveSelected.length === proyectos.length;

  function apply(next: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.length === 1 && next[0] === NINGUNO) {
      params.set('proyecto', NINGUNO);
    } else if (next.length && next.length < proyectos.length) {
      params.set('proyecto', next.join(','));
    } else {
      // Vacío o todos marcados = mismo estado implícito "todos" con el que
      // arranca la página, URL más corta.
      params.delete('proyecto');
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggle(p: string) {
    const next = effectiveSelected.includes(p) ? effectiveSelected.filter((x) => x !== p) : [...effectiveSelected, p];
    apply(next.length ? next : [NINGUNO]);
  }

  const label = esNinguno
    ? 'Ninguno seleccionado'
    : allSelected
      ? 'Todos los proyectos'
      : effectiveSelected.length === 1
        ? effectiveSelected[0]
        : `${effectiveSelected.length} proyectos`;

  return (
    <div ref={ref} className="relative mb-5 inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-bold text-[var(--text)] outline-none transition-colors hover:border-[var(--border-strong)]"
      >
        <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Proyecto</span>
        <span className="max-w-[180px] truncate">{label}</span>
        <ChevronDown size={13} className={`flex-none transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1.5 max-h-80 w-72 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              {effectiveSelected.length} seleccionado{effectiveSelected.length === 1 ? '' : 's'}
            </span>
            <div className="flex items-center gap-2">
              {!allSelected && (
                <button onClick={() => apply([])} className="text-[11px] font-semibold text-[var(--accent-bright)] hover:underline">
                  Todos
                </button>
              )}
              {!esNinguno && (
                <button
                  onClick={() => apply([NINGUNO])}
                  className="text-[11px] font-semibold text-[var(--text-muted)] hover:underline"
                >
                  Ninguno
                </button>
              )}
            </div>
          </div>
          {proyectos.map((p) => (
            <label
              key={p}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
            >
              <input
                type="checkbox"
                checked={effectiveSelected.includes(p)}
                onChange={() => toggle(p)}
                className="h-3.5 w-3.5 accent-[var(--accent)]"
              />
              <span className="truncate">{p}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
